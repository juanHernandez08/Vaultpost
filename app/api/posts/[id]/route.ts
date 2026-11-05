// app/api/posts/[id]/route.ts
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, first, tables } from '@/lib/db'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule } from '@/lib/permissions'
import { visibleAccountIds } from '@/lib/db/scope'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const post = await db
    .select({ id: tables.scheduled_posts.id, status: tables.scheduled_posts.status, social_account_id: tables.scheduled_posts.social_account_id })
    .from(tables.scheduled_posts)
    .where(eq(tables.scheduled_posts.id, params.id))
    .then(first)

  if (!post) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  if (!(await visibleAccountIds(guard.user)).includes(post.social_account_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (!['draft', 'scheduled'].includes(post.status)) {
    return NextResponse.json(
      { error: 'Solo se pueden editar posts en draft o scheduled' },
      { status: 400 }
    )
  }

  const VALID_TYPES = ['post', 'reel', 'story', 'video'] as const

  const update: Partial<typeof tables.scheduled_posts.$inferInsert> = {}
  if (body.caption !== undefined) update.caption = body.caption?.trim() || null
  if (body.media_url !== undefined) update.media_url = body.media_url?.trim() || null
  if (body.scheduled_at !== undefined) {
    if (isNaN(Date.parse(body.scheduled_at))) {
      return NextResponse.json({ error: 'scheduled_at inválido' }, { status: 400 })
    }
    update.scheduled_at = new Date(body.scheduled_at).toISOString()
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Ningún campo válido para actualizar' }, { status: 400 })
  }

  const [updated] = await db
    .update(tables.scheduled_posts)
    .set(update)
    .where(eq(tables.scheduled_posts.id, params.id))
    .returning()

  return NextResponse.json({ post: updated })
}

// DELETE /api/posts/[id] — cancelar/eliminar post
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para cancelar posts' }, { status: 403 })
  }

  const post = await db
    .select({ id: tables.scheduled_posts.id, status: tables.scheduled_posts.status, social_account_id: tables.scheduled_posts.social_account_id })
    .from(tables.scheduled_posts)
    .where(eq(tables.scheduled_posts.id, params.id))
    .then(first)

  if (!post) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  if (!(await visibleAccountIds(guard.user)).includes(post.social_account_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (post.status === 'publishing') {
    return NextResponse.json(
      { error: 'No se puede eliminar un post en proceso de publicación' },
      { status: 400 }
    )
  }

  await db.delete(tables.scheduled_posts).where(eq(tables.scheduled_posts.id, params.id))

  return NextResponse.json({ success: true })
}
