'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PenSquare, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduledPost } from '@/lib/types'

type PostWithAccount = ScheduledPost & {
  social_account: {
    id: string
    platform: string
    username: string
    client_id: string
    client: { id: string; name: string } | null
  } | null
}

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook: { bg: 'bg-blue-600', label: 'FB' },
  tiktok: { bg: 'bg-zinc-900', label: 'TK' },
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'blue' | 'zinc' | 'green' | 'red' | 'amber' }> = {
  scheduled: { label: 'Programado', variant: 'blue' },
  draft: { label: 'Borrador', variant: 'zinc' },
  published: { label: 'Publicado', variant: 'green' },
  failed: { label: 'Fallido', variant: 'red' },
  publishing: { label: 'Publicando...', variant: 'amber' },
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: 'Programados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'published', label: 'Publicados' },
  { value: 'failed', label: 'Fallidos' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(posts: PostWithAccount[]): Record<string, PostWithAccount[]> {
  return posts.reduce<Record<string, PostWithAccount[]>>((acc, post) => {
    const date = new Date(post.scheduled_at).toLocaleDateString('es-AR')
    if (!acc[date]) acc[date] = []
    acc[date].push(post)
    return acc
  }, {})
}

interface CalendarClientProps {
  posts: PostWithAccount[]
  canDelete: boolean
}

export function CalendarClient({ posts: initialPosts, canDelete }: CalendarClientProps) {
  const [posts, setPosts] = useState<PostWithAccount[]>(initialPosts)
  const [filter, setFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter)
  const grouped = groupByDate(filtered)
  const dateKeys = Object.keys(grouped).sort((a, b) => {
    const da = new Date(grouped[a][0].scheduled_at)
    const db = new Date(grouped[b][0].scheduled_at)
    return db.getTime() - da.getTime()
  })

  async function handleDelete(postId: string) {
    if (deletingId) return
    setDeletingId(postId)

    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setDeletingId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Error al eliminar el post')
      return
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId))
    toast.success('Post eliminado')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Calendario</h1>
          <p className="text-sm text-zinc-500">{posts.length} post{posts.length !== 1 ? 's' : ''} en total</p>
        </div>
        <Button asChild>
          <Link href="/compose">
            <PenSquare className="mr-2 h-4 w-4" />
            Nuevo post
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-zinc-500 text-sm font-medium">No hay posts{filter !== 'all' ? ' con este filtro' : ' aún'}</p>
          {filter === 'all' && (
            <Link href="/compose" className="mt-3 text-sm text-zinc-900 underline underline-offset-4">
              Crear tu primer post
            </Link>
          )}
        </div>
      )}

      {/* Posts grouped by date */}
      {dateKeys.map((dateKey) => (
        <div key={dateKey} className="space-y-2">
          <h2 className="text-sm font-semibold capitalize text-zinc-500 border-b border-zinc-100 pb-1">
            {formatDate(grouped[dateKey][0].scheduled_at)}
          </h2>
          <div className="space-y-2">
            {grouped[dateKey].map((post) => {
              const account = post.social_account
              const style = account ? (PLATFORM_STYLES[account.platform] ?? { bg: 'bg-zinc-400', label: '?' }) : { bg: 'bg-zinc-400', label: '?' }
              const statusConf = STATUS_CONFIG[post.status] ?? { label: post.status, variant: 'zinc' as const }
              const canDeletePost = canDelete && ['draft', 'scheduled', 'failed'].includes(post.status)

              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4"
                >
                  {/* Platform badge */}
                  <div
                    className={cn(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white mt-0.5',
                      style.bg
                    )}
                  >
                    {style.label}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-900">
                        {account?.client?.name ?? 'Cliente'} · @{account?.username ?? '-'}
                      </span>
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      <Badge variant="secondary">{post.content_type}</Badge>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-zinc-600 line-clamp-2 mb-1">{post.caption}</p>
                    )}
                    {post.error_msg && (
                      <p className="text-xs text-red-500">{post.error_msg}</p>
                    )}
                    <p className="text-xs text-zinc-400">{formatTime(post.scheduled_at)}</p>
                  </div>

                  {/* Actions */}
                  {canDeletePost && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="flex-shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
