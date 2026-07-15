// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { count, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, tables } from '@/lib/db'
import { createSession } from '@/lib/auth/session'
import { toPublicUser } from '@/lib/auth/user'
import { validatePassword } from '@/lib/validation'
import type { UserRole } from '@/lib/types'

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

  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Verificar que el correo no esté en uso
  const existing = db
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(eq(tables.users.email, normalizedEmail))
    .get()

  if (existing) {
    return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  try {
    // Transacción: empresa (si es nueva) + usuario + owner, todo o nada
    const user = db.transaction((tx) => {
      let companyId: string
      let isNewCompany = false
      let role: UserRole

      if (company_id) {
        const company = tx
          .select({ id: tables.companies.id })
          .from(tables.companies)
          .where(eq(tables.companies.id, company_id))
          .get()

        if (!company) throw new RegisterError('Empresa no encontrada', 400)
        companyId = company.id

        // Primer usuario de la empresa → admin, resto → custom
        const { value: userCount } = tx
          .select({ value: count() })
          .from(tables.users)
          .where(eq(tables.users.company_id, companyId))
          .get() ?? { value: 0 }

        role = userCount === 0 ? 'admin' : 'custom'
      } else {
        const created = tx
          .insert(tables.companies)
          .values({ name: new_company_name!.trim(), plan: 'free' })
          .returning({ id: tables.companies.id })
          .get()

        companyId = created.id
        isNewCompany = true
        role = 'admin'
      }

      const inserted = tx
        .insert(tables.users)
        .values({
          company_id: companyId,
          email: normalizedEmail,
          password_hash,
          full_name: full_name!.trim(),
          role,
          permissions: {},
        })
        .returning()
        .get()

      if (isNewCompany) {
        tx.update(tables.companies)
          .set({ owner_id: inserted.id })
          .where(eq(tables.companies.id, companyId))
          .run()
      }

      return inserted
    })

    // Auto-login: dejar la sesión creada
    await createSession(user.id)

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 })
  } catch (err) {
    if (err instanceof RegisterError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[POST /api/auth/register]', msg)
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
  }
}

class RegisterError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}
