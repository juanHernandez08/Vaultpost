// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  return null
}

export async function POST(request: Request) {
  const body = await request.json()
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
  const { count } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company_id)

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
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.error('[POST /api/auth/register] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
