// app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule, canViewClient } from '@/lib/permissions'
import type { PostStatus } from '@/lib/types'

// GET /api/posts — lista posts accesibles al usuario
// Query params opcionales: ?account_id=uuid&status=scheduled
export async function GET(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status')

  const supabase = createClient()

  let query = supabase
    .from('scheduled_posts')
    .select('*, social_account:social_accounts(id, platform, username, client_id, client:clients(id, name))')
    .order('scheduled_at', { ascending: false })

  if (accountId) query = query.eq('social_account_id', accountId)
  if (status) query = query.eq('status', status as PostStatus)

  const { data: postsRaw, error } = await query

  if (error) {
    console.error('[GET /api/posts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filtrar por permisos del usuario
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (postsRaw ?? []).filter((p: any) => {
    const clientId = p.social_account?.client_id
    if (!clientId) return false
    return canViewClient(guard.user, clientId)
  })

  return NextResponse.json({ posts })
}

// POST /api/posts — crear post programado o borrador
export async function POST(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para programar posts' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { social_account_id, content_type, caption, media_url, scheduled_at, status = 'scheduled' } = body

  if (!social_account_id || !content_type || !scheduled_at) {
    return NextResponse.json(
      { error: 'social_account_id, content_type y scheduled_at son requeridos' },
      { status: 400 }
    )
  }

  const validTypes = ['post', 'reel', 'story', 'video']
  if (!validTypes.includes(content_type)) {
    return NextResponse.json({ error: 'content_type inválido' }, { status: 400 })
  }

  const validStatuses = ['draft', 'scheduled']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const supabase = createClient()

  // Verificar que la cuenta existe y el usuario puede acceder
  const { data: accountRaw, error: accountError } = await supabase
    .from('social_accounts')
    .select('id, client_id')
    .eq('id', social_account_id)
    .single()

  if (accountError || !accountRaw) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  const account = accountRaw as { id: string; client_id: string }
  if (!canViewClient(guard.user, account.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a esta cuenta' }, { status: 403 })
  }

  const { data: post, error: insertError } = await supabase
    .from('scheduled_posts')
    .insert({
      social_account_id,
      content_type,
      caption: caption?.trim() || null,
      media_url: media_url?.trim() || null,
      scheduled_at,
      status,
      created_by_id: guard.user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[POST /api/posts]', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ post }, { status: 201 })
}
