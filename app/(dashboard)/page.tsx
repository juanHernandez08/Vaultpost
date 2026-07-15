import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, AtSign, Clock, CheckCircle2, PenSquare } from 'lucide-react'
import type { User } from '@/lib/types'

type UpcomingPost = {
  id: string
  content_type: string
  caption: string | null
  scheduled_at: string
  social_account: {
    platform: string
    username: string
    client: { name: string } | null
  } | null
}

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook: { bg: 'bg-blue-600', label: 'FB' },
  tiktok: { bg: 'bg-zinc-900', label: 'TK' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser?.id ?? '')
    .single()

  const profile = profileRaw as User | null
  const isAdminUser = profile?.role === 'admin'

  // Para usuarios no-admin, limitar los contadores a los clientes permitidos
  let allowedClientIds: string[] | null = null // null = sin restricción (admin)
  if (!isAdminUser) {
    allowedClientIds = profile?.permissions?.clients ?? []
  }

  let allowedAccountIds: string[] | null = null
  if (allowedClientIds !== null) {
    if (allowedClientIds.length === 0) {
      allowedAccountIds = []
    } else {
      const { data: accountRows } = await supabase
        .from('social_accounts')
        .select('id')
        .in('client_id', allowedClientIds)
      allowedAccountIds = (accountRows ?? []).map((a: { id: string }) => a.id)
    }
  }

  let clientsQuery = supabase.from('clients').select('*', { count: 'exact', head: true })
  let accountsQuery = supabase
    .from('social_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  let pendingQuery = supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
  let publishedQuery = supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
  let upcomingQuery = supabase
    .from('scheduled_posts')
    .select('id, content_type, caption, scheduled_at, social_account:social_accounts(platform, username, client:clients(name))')
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5)

  if (allowedClientIds !== null) {
    clientsQuery = clientsQuery.in('id', allowedClientIds)
    accountsQuery = accountsQuery.in('client_id', allowedClientIds)
    pendingQuery = pendingQuery.in('social_account_id', allowedAccountIds ?? [])
    publishedQuery = publishedQuery.in('social_account_id', allowedAccountIds ?? [])
    upcomingQuery = upcomingQuery.in('social_account_id', allowedAccountIds ?? [])
  }

  const [clientsResult, accountsResult, pendingResult, publishedResult, upcomingResult] =
    await Promise.all([clientsQuery, accountsQuery, pendingQuery, publishedQuery, upcomingQuery])

  const queryError =
    clientsResult.error ??
    accountsResult.error ??
    pendingResult.error ??
    publishedResult.error ??
    upcomingResult.error

  if (queryError) {
    console.error('[DashboardPage] Supabase query error:', queryError.message)
  }

  const upcoming = (upcomingResult.data ?? []) as unknown as UpcomingPost[]

  const stats = [
    {
      label: 'Clientes',
      value: clientsResult.count ?? 0,
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Cuentas activas',
      value: accountsResult.count ?? 0,
      icon: AtSign,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      label: 'Posts pendientes',
      value: pendingResult.count ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Publicados',
      value: publishedResult.count ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Resumen general de tu agencia</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-zinc-500">{stat.label}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Próximas publicaciones */}
      <Card className="border-zinc-200 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Próximas publicaciones
          </CardTitle>
          <Link
            href="/calendar"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Ver calendario
          </Link>
        </CardHeader>
        <CardContent className="pb-5">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PenSquare className="mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No hay posts programados.</p>
              <Link
                href="/compose"
                className="mt-2 text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                Programar un post
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {upcoming.map((post) => {
                const account = post.social_account
                const style = account
                  ? (PLATFORM_STYLES[account.platform] ?? { bg: 'bg-zinc-400', label: '?' })
                  : { bg: 'bg-zinc-400', label: '?' }
                return (
                  <div key={post.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${style.bg}`}
                    >
                      {style.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {account?.client?.name ?? 'Cliente'} · @{account?.username ?? '-'}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {post.caption || 'Sin caption'}
                      </p>
                    </div>
                    <Badge variant="secondary">{post.content_type}</Badge>
                    <p className="whitespace-nowrap text-xs text-zinc-400">
                      {formatDateTime(post.scheduled_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
