// app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json() as { name?: string; logo_url?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const client = db
    .update(tables.clients)
    .set({ name: name.trim(), logo_url: logo_url?.trim() || null })
    .where(and(eq(tables.clients.id, params.id), eq(tables.clients.company_id, guard.user.company_id)))
    .returning()
    .get()

  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ client })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const deleted = db
    .delete(tables.clients)
    .where(and(eq(tables.clients.id, params.id), eq(tables.clients.company_id, guard.user.company_id)))
    .returning({ id: tables.clients.id })
    .get()

  if (!deleted) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
