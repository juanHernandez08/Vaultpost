import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const adminClient = createAdminClient()

  // Verify the user belongs to the same company
  const { data: target } = await adminClient
    .from('users')
    .select('id, company_id')
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Delete from auth.users (ON DELETE CASCADE removes public.users row)
  const { error } = await adminClient.auth.admin.deleteUser(params.id)

  if (error) {
    console.error('[DELETE /api/users/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
