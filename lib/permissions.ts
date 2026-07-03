import type { User, UserPermissions } from '@/lib/types'

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

export function canViewClient(user: User, clientId: string): boolean {
  if (isAdmin(user)) return true
  const perms = user.permissions as UserPermissions
  if (!perms.clients || perms.clients.length === 0) return false
  return perms.clients.includes(clientId)
}

export function canSchedule(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_schedule
}

export function canPublish(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_publish
}

export function canViewAnalytics(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_view_analytics
}

export function canManageAccounts(user: User): boolean {
  return isAdmin(user)
}
