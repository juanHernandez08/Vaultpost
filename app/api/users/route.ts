import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'
import { toPublicUser } from '@/lib/auth/user'
import { validatePassword } from '@/lib/validation'
import type { UserRole } from '@/lib/types'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const rows = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.company_id, guard.user.company_id))
    .orderBy(asc(tables.users.created_at))
    .all()

  return NextResponse.json({ users: rows.map(toPublicUser) })
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

  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = db
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(eq(tables.users.email, normalizedEmail))
    .get()

  if (existing) {
    return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const inserted = db
    .insert(tables.users)
    .values({
      company_id: guard.user.company_id,
      email: normalizedEmail,
      password_hash,
      full_name: full_name.trim(),
      role: role as UserRole,
      permissions: {},
    })
    .returning()
    .get()

  return NextResponse.json({ user: toPublicUser(inserted) }, { status: 201 })
}
