// app/api/posts/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule, canViewClient } from '@/lib/permissions'

// PATCH /api/posts/[id] — editar post (solo draft | scheduled)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para editar posts' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const supabase = createClient()

  const { data: postRaw, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, status, social_account:social_accounts(client_id)')
    .eq('id', params.id)
    .single()

  if (fetchError || !postRaw) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  const post = postRaw as any
  if (!canViewClient(guard.user, post.social_account?.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (!['draft', 'scheduled'].includes(post.status)) {
    return NextResponse.json(
      { error: 'Solo se pueden editar posts en draft o scheduled' },
      { status: 400 }
    )
  }

  const VALID_TYPES = ['post', 'reel', 'story', 'video']

  const update: Record<string, unknown> = {}
  if (body.caption !== undefined) update.caption = body.caption?.trim() || null
  if (body.media_url !== undefined) update.media_url = body.media_url?.trim() || null
  if (body.scheduled_at !== undefined) {
    if (isNaN(Date.parse(body.scheduled_at))) {
      return NextResponse.json({ error: 'scheduled_at inválido' }, { status: 400 })
    }
    update.scheduled_at = body.scheduled_at
  }
  if (body.content_type !== undefined) {
    if (!VALID_TYPES.includes(body.content_type)) {
      return NextResponse.json({ error: 'content_type inválido' }, { status: 400 })
    }
    update.content_type = body.content_type
  }
  if (body.status !== undefined && ['draft', 'scheduled'].includes(body.status)) {
    update.status = body.status
  }

  const { data: updated, error: updateError } = await supabase
    .from('scheduled_posts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('[PATCH /api/posts/[id]]', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ post: updated })
}

// DELETE /api/posts/[id] — cancelar/eliminar post
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para cancelar posts' }, { status: 403 })
  }

  const supabase = createClient()

  const { data: postRaw, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, status, social_account:social_accounts(client_id)')
    .eq('id', params.id)
    .single()

  if (fetchError || !postRaw) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  const post = postRaw as any
  if (!canViewClient(guard.user, post.social_account?.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (post.status === 'publishing') {
    return NextResponse.json(
      { error: 'No se puede eliminar un post en proceso de publicación' },
      { status: 400 }
    )
  }

  const { error: deleteError } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    console.error('[DELETE /api/posts/[id]]', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
