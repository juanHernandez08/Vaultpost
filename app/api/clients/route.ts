import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const clients = await db
    .select()
    .from(tables.clients)
    .where(eq(tables.clients.company_id, guard.user.company_id))
    .orderBy(asc(tables.clients.name))

  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const [client] = await db
    .insert(tables.clients)
    .values({
      company_id: guard.user.company_id,
      name: name.trim(),
      logo_url: logo_url?.trim() || null,
    })
    .returning()

  return NextResponse.json({ client }, { status: 201 })
}
