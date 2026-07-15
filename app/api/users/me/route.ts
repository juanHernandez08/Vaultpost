// app/api/users/me/route.ts — perfil del usuario autenticado
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, tables } from '@/lib/db'
import { requireAuthApi } from '@/lib/api-guard'
import { toPublicUser } from '@/lib/auth/user'
import { validatePassword } from '@/lib/validation'

// PATCH /api/users/me — actualizar nombre y/o contraseña propios
export async function PATCH(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  let body: { full_name?: string; new_password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const update: { full_name?: string | null; password_hash?: string } = {}

  if (body.full_name !== undefined) {
    update.full_name = body.full_name.trim() || null
  }

  if (body.new_password !== undefined) {
    const passwordError = validatePassword(body.new_password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
    update.password_hash = await bcrypt.hash(body.new_password, 10)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Ningún campo válido para actualizar' }, { status: 400 })
  }

  const updated = db
    .update(tables.users)
    .set(update)
    .where(eq(tables.users.id, guard.user.id))
    .returning()
    .get()

  return NextResponse.json({ user: toPublicUser(updated) })
}
