// app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  // SSR client uses user session — RLS ensures company isolation automatically
  const supabase = createClient()
  const { data: client, error } = await supabase
    .from('clients')
    .update({ name: name.trim(), logo_url: logo_url?.trim() || null })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    console.error('[PATCH /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  // SSR client uses user session — RLS ensures company isolation automatically
  const supabase = createClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('[DELETE /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
