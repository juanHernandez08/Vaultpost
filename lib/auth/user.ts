// lib/auth/user.ts
// Helpers para obtener el usuario autenticado desde server components y APIs.
import { eq } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { getSessionUserId } from './session'
import type { User, Company, UserRole, UserPermissions } from '@/lib/types'

export type ProfileWithCompany = User & { company: Company | null }

type DbUserRow = typeof tables.users.$inferSelect

/** Convierte una fila de DB al tipo público User (sin password_hash). */
export function toPublicUser(row: DbUserRow): User {
  return {
    id: row.id,
    company_id: row.company_id,
    email: row.email,
    full_name: row.full_name,
    role: row.role as UserRole,
    permissions: (row.permissions ?? {}) as UserPermissions,
    created_at: row.created_at,
  }
}

/** Usuario de la sesión actual, o null. */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId()
  if (!userId) return null

  const row = db.select().from(tables.users).where(eq(tables.users.id, userId)).get()
  return row ? toPublicUser(row) : null
}

/** Usuario de la sesión actual con su empresa, o null. */
export async function getCurrentUserWithCompany(): Promise<ProfileWithCompany | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const company =
    db.select().from(tables.companies).where(eq(tables.companies.id, user.company_id)).get() ??
    null

  return { ...user, company }
}
