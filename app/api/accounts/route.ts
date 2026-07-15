// app/api/accounts/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'
import { encrypt } from '@/lib/crypto'

const SAFE_SELECT = 'id, client_id, platform, username, is_active, added_by_id, created_at, client:clients(id, name)'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select(SAFE_SELECT)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/accounts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ accounts })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { client_id, platform, username, access_token } = await request.json()

  if (!client_id || !platform || !username?.trim()) {
    return NextResponse.json(
      { error: 'client_id, platform y username son requeridos' },
      { status: 400 }
    )
  }

  if (!['instagram', 'facebook', 'tiktok'].includes(platform)) {
    return NextResponse.json(
      { error: 'platform debe ser instagram, facebook o tiktok' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // Verificar que el cliente pertenece a la empresa del admin (evita cross-tenant)
  const { data: client } = await adminClient
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('company_id', guard.user.company_id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const access_token_enc = access_token?.trim() ? encrypt(access_token.trim()) : null

  const { data: account, error } = await adminClient
    .from('social_accounts')
    .insert({
      client_id,
      platform,
      username: username.trim(),
      access_token_enc,
      is_active: true,
      added_by_id: guard.user.id,
    })
    .select(SAFE_SELECT)
    .single()

  if (error) {
    console.error('[POST /api/accounts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account }, { status: 201 })
}
