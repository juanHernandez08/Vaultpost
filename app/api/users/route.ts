import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'
import type { Database } from '@/lib/types'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/users]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const body = await request.json()
  const { email, full_name, password, role = 'custom' } = body

  if (!email?.trim() || !full_name?.trim() || !password) {
    return NextResponse.json(
      { error: 'email, full_name y password son requeridos' },
      { status: 400 }
    )
  }

  if (!['admin', 'custom'].includes(role)) {
    return NextResponse.json({ error: 'role debe ser admin o custom' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 1. Create user in auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError) {
    console.error('[POST /api/users] createUser:', authError.message)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Insert into public.users
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      company_id: guard.user.company_id,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
      permissions: {},
    } as any)
    .select()
    .single()

  if (userError) {
    // Rollback: delete the auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.error('[POST /api/users] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
