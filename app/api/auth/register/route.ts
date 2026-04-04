// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types'

const PASSWORD_ERROR = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'

function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return PASSWORD_ERROR
  }
  return null
}

export async function POST(request: Request) {
  let body: { company_id?: string; full_name?: string; email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { company_id, full_name, email, password } = body

  // Validar campos requeridos
  if (!company_id || !full_name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: 'company_id, full_name, email y password son requeridos' },
      { status: 400 }
    )
  }

  // Validar contraseña
  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verificar que la empresa existe
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 400 })
  }

  // Determinar rol: primer usuario de la empresa → admin, resto → custom
  const { count, error: countError } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company_id)

  if (countError) {
    console.error('[POST /api/auth/register] count users:', countError.message)
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  const role: UserRole = (count ?? 0) === 0 ? 'admin' : 'custom'

  // Crear usuario en auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError) {
    console.error('[POST /api/auth/register] createUser:', authError.message)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insertar en public.users
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      company_id,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
      permissions: {},
    })
    .select()
    .single()

  if (userError) {
    // Rollback: eliminar el auth user
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(authData.user.id)
    if (rollbackError) {
      console.error('[POST /api/auth/register] ROLLBACK FAILED — orphaned auth user:', authData.user.id, rollbackError.message)
    }
    console.error('[POST /api/auth/register] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
