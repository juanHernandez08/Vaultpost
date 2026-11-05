// app/api/accounts/[id]/route.ts
import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db, first, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'
import { companyClientIds } from '@/lib/db/scope'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  // Solo cuentas de clientes de la empresa del admin
  const deleted = await db
    .delete(tables.social_accounts)
    .where(
      and(
        eq(tables.social_accounts.id, params.id),
        inArray(tables.social_accounts.client_id, companyClientIds(guard.user.company_id))
      )
    )
    .returning({ id: tables.social_accounts.id })
    .then(first)

  if (!deleted) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
