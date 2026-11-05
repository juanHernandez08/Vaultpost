import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, first, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'
import { toPublicUser } from '@/lib/auth/user'
import type { UserPermissions } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const body = await request.json() as { permissions: unknown }
  const { permissions } = body

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return NextResponse.json({ error: 'permissions es requerido' }, { status: 400 })
  }

  const updated = await db
    .update(tables.users)
    .set({ permissions: permissions as UserPermissions })
    .where(and(eq(tables.users.id, params.id), eq(tables.users.company_id, guard.user.company_id)))
    .returning()
    .then(first)

  if (!updated) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ user: toPublicUser(updated) })
}
