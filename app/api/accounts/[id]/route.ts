// app/api/accounts/[id]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const adminClient = createAdminClient()

  // Verificar que la cuenta pertenece a un cliente de la empresa del admin
  const { data: accountRaw } = await adminClient
    .from('social_accounts')
    .select('id, client:clients(company_id)')
    .eq('id', params.id)
    .single()

  type AccountWithClient = { id: string; client: { company_id: string } | null } | null
  const account = accountRaw as unknown as AccountWithClient
  const clientCompanyId = account?.client?.company_id

  if (!accountRaw || clientCompanyId !== guard.user.company_id) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('social_accounts')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('[DELETE /api/accounts/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
