// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types'
import { validatePassword } from '@/lib/validation'

export async function POST(request: Request) {
  let body: {
    company_id?: string
    new_company_name?: string
    full_name?: string
    email?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { company_id, new_company_name, full_name, email, password } = body

  // Validar campos requeridos: empresa existente O nombre de empresa nueva
  if ((!company_id && !new_company_name?.trim()) || !full_name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: 'empresa (existente o nueva), full_name, email y password son requeridos' },
      { status: 400 }
    )
  }

  // Validar contraseña
  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const adminClient = createAdminClient()

  let companyId: string
  let createdCompanyId: string | null = null
  let role: UserRole

  if (company_id) {
    // Unirse a una empresa existente
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 400 })
    }

    companyId = company_id

    // Determinar rol: primer usuario de la empresa → admin, resto → custom
    const { count, error: countError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (countError) {
      console.error('[POST /api/auth/register] count users:', countError.message)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    role = (count ?? 0) === 0 ? 'admin' : 'custom'
  } else {
    // Crear una empresa nueva — quien la crea es su admin
    const { data: newCompany, error: createCompanyError } = await adminClient
      .from('companies')
      .insert({ name: new_company_name!.trim(), plan: 'free' })
      .select('id')
      .single()

    if (createCompanyError || !newCompany) {
      console.error('[POST /api/auth/register] create company:', createCompanyError?.message)
      return NextResponse.json({ error: 'No se pudo crear la empresa' }, { status: 500 })
    }

    companyId = newCompany.id
    createdCompanyId = newCompany.id
    role = 'admin'
  }

  // Rollback de la empresa recién creada si falla algún paso posterior
  async function rollbackCompany() {
    if (!createdCompanyId) return
    const { error } = await adminClient.from('companies').delete().eq('id', createdCompanyId)
    if (error) {
      console.error('[POST /api/auth/register] ROLLBACK FAILED — orphaned company:', createdCompanyId, error.message)
    }
  }

  // Crear usuario en auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError) {
    console.error('[POST /api/auth/register] createUser:', authError.message)
    await rollbackCompany()
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insertar en public.users
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      company_id: companyId,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
      permissions: {},
    })
    .select()
    .single()

  if (userError) {
    // Rollback: eliminar el auth user (y la empresa si se creó recién)
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(authData.user.id)
    if (rollbackError) {
      console.error('[POST /api/auth/register] ROLLBACK FAILED — orphaned auth user:', authData.user.id, rollbackError.message)
    }
    await rollbackCompany()
    console.error('[POST /api/auth/register] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  // Registrar al creador como owner de la empresa nueva
  if (createdCompanyId) {
    const { error: ownerError } = await adminClient
      .from('companies')
      .update({ owner_id: user.id })
      .eq('id', createdCompanyId)
    if (ownerError) {
      // No es fatal: la empresa y el admin ya existen
      console.error('[POST /api/auth/register] set owner:', ownerError.message)
    }
  }

  return NextResponse.json({ user }, { status: 201 })
}
