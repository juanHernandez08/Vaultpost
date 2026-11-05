// app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule } from '@/lib/permissions'
import { visibleAccountIds } from '@/lib/db/scope'
import type { PostStatus } from '@/lib/types'

// GET /api/posts — lista posts accesibles al usuario
// Query params opcionales: ?account_id=uuid&status=scheduled
export async function GET(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status')

  // Scoping por empresa + permisos (reemplaza al RLS de Postgres)
  const allowedIds = await visibleAccountIds(guard.user)
  if (allowedIds.length === 0) {
    return NextResponse.json({ posts: [] })
  }

  const conditions = [inArray(tables.scheduled_posts.social_account_id, allowedIds)]
  if (accountId) conditions.push(eq(tables.scheduled_posts.social_account_id, accountId))
  if (status) conditions.push(eq(tables.scheduled_posts.status, status as PostStatus))

  const posts = await db.query.scheduled_posts.findMany({
    where: and(...conditions),
    with: {
      social_account: {
        columns: { id: true, platform: true, username: true, client_id: true },
        with: { client: { columns: { id: true, name: true } } },
      },
    },
    orderBy: [desc(tables.scheduled_posts.scheduled_at)],
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

  if (isNaN(Date.parse(scheduled_at))) {
    return NextResponse.json({ error: 'scheduled_at inválido' }, { status: 400 })
  }

  // Verificar que la cuenta existe y el usuario puede acceder
  const allowedIds = await visibleAccountIds(guard.user)
  if (!allowedIds.includes(social_account_id)) {
    return NextResponse.json({ error: 'Sin acceso a esta cuenta' }, { status: 403 })
  }

  const [post] = await db
    .insert(tables.scheduled_posts)
    .values({
      social_account_id,
      content_type,
      caption: caption?.trim() || null,
      media_url: media_url?.trim() || null,
      scheduled_at: new Date(scheduled_at).toISOString(),
      status,
      created_by_id: guard.user.id,
    })
    .returning()

  return NextResponse.json({ post }, { status: 201 })
}
