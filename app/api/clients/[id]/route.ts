import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: client, error } = await (adminClient
    .from('clients') as any)
    .update({ name: name.trim(), logo_url: logo_url?.trim() || null })
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('clients')
    .delete()
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)

  if (error) {
    console.error('[DELETE /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
