// lib/db/scope.ts
// Sin RLS de Postgres, el aislamiento multi-tenant se aplica acá:
// subqueries reutilizables para limitar cada consulta a la empresa del
// usuario (y, para no-admins, a sus clientes asignados).
import { eq, inArray } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import type { User } from '@/lib/types'
import { isAdmin } from '@/lib/permissions'

/** Subquery: ids de clientes de una empresa. */
export function companyClientIds(companyId: string) {
  return db
    .select({ id: tables.clients.id })
    .from(tables.clients)
    .where(eq(tables.clients.company_id, companyId))
}

/** Subquery: ids de cuentas sociales de una empresa. */
export function companyAccountIds(companyId: string) {
  return db
    .select({ id: tables.social_accounts.id })
    .from(tables.social_accounts)
    .where(inArray(tables.social_accounts.client_id, companyClientIds(companyId)))
}

/**
 * Ids de clientes visibles para un usuario: todos los de su empresa si es
 * admin, o solo los asignados en sus permisos. Devuelve una lista materializada.
 */
export function visibleClientIds(user: User): string[] {
  if (isAdmin(user)) {
    return db
      .select({ id: tables.clients.id })
      .from(tables.clients)
      .where(eq(tables.clients.company_id, user.company_id))
      .all()
      .map((c) => c.id)
  }
  const assigned = user.permissions?.clients ?? []
  if (assigned.length === 0) return []
  // Intersectar con la empresa por si un permiso quedó apuntando a otra empresa
  return db
    .select({ id: tables.clients.id })
    .from(tables.clients)
    .where(eq(tables.clients.company_id, user.company_id))
    .all()
    .map((c) => c.id)
    .filter((id) => assigned.includes(id))
}

/** Ids de cuentas sociales visibles para un usuario (lista materializada). */
export function visibleAccountIds(user: User): string[] {
  const clientIds = visibleClientIds(user)
  if (clientIds.length === 0) return []
  return db
    .select({ id: tables.social_accounts.id })
    .from(tables.social_accounts)
    .where(inArray(tables.social_accounts.client_id, clientIds))
    .all()
    .map((a) => a.id)
}
