import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, first, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  if (params.id === guard.user.id) {
    return NextResponse.json(
      { error: 'No puedes eliminarte a ti mismo' },
      { status: 400 }
    )
  }

  // Verificar que el usuario pertenece a la misma empresa
  const target = await db
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(and(eq(tables.users.id, params.id), eq(tables.users.company_id, guard.user.company_id)))
    .then(first)

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  await db.delete(tables.users).where(eq(tables.users.id, params.id))

  return NextResponse.json({ success: true })
}
