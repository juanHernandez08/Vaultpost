// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, tables } from '@/lib/db'
import { createSession } from '@/lib/auth/session'
import { toPublicUser } from '@/lib/auth/user'

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { email, password } = body
  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'email y password son requeridos' }, { status: 400 })
  }

  const row = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, email.trim().toLowerCase()))
    .get()

  // Comparar siempre contra un hash (aunque el usuario no exista) para no
  // filtrar por timing qué correos están registrados
  const DUMMY_HASH = '$2b$10$C6UzMDM.H6dfI/f/IKcEeO7ZUr5nOdN5zXWLxLdRc1sJx1e3lJdIe'
  const valid = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH)

  if (!row || !valid) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
  }

  await createSession(row.id)
  return NextResponse.json({ user: toPublicUser(row) })
}
