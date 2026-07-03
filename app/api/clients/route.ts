import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[GET /api/clients]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: client, error } = await adminClient
    .from('clients')
    .insert({
      company_id: guard.user.company_id,
      name: name.trim(),
      logo_url: logo_url?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/clients]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client }, { status: 201 })
}
