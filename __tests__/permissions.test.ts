import {
  isAdmin,
  canViewClient,
  canSchedule,
  canPublish,
  canViewAnalytics,
  canManageAccounts,
} from '@/lib/permissions'
import type { User } from '@/lib/types'

const adminUser: User = {
  id: 'admin-1',
  company_id: 'company-1',
  email: 'admin@test.com',
  full_name: 'Admin',
  role: 'admin',
  permissions: {},
  created_at: '2026-01-01',
}

const customUserWithPerms: User = {
  id: 'user-1',
  company_id: 'company-1',
  email: 'user@test.com',
  full_name: 'User',
  role: 'custom',
  permissions: {
    clients: ['client-1', 'client-2'],
    can_publish: true,
    can_schedule: true,
    can_view_analytics: true,
    can_manage_accounts: false,
  },
  created_at: '2026-01-01',
}

const customUserNoPerms: User = {
  ...customUserWithPerms,
  id: 'user-2',
  permissions: {},
}

test('isAdmin: admin user returns true', () => {
  expect(isAdmin(adminUser)).toBe(true)
})

test('isAdmin: custom user returns false', () => {
  expect(isAdmin(customUserWithPerms)).toBe(false)
})

test('canViewClient: admin sees all clients', () => {
  expect(canViewClient(adminUser, 'any-client-id')).toBe(true)
})

test('canViewClient: custom user sees only assigned clients', () => {
  expect(canViewClient(customUserWithPerms, 'client-1')).toBe(true)
  expect(canViewClient(customUserWithPerms, 'client-999')).toBe(false)
})

test('canViewClient: custom user without clients sees nothing', () => {
  expect(canViewClient(customUserNoPerms, 'client-1')).toBe(false)
})

test('canSchedule: admin always true', () => {
  expect(canSchedule(adminUser)).toBe(true)
})

test('canSchedule: respects permissions flag', () => {
  expect(canSchedule(customUserWithPerms)).toBe(true)
  expect(canSchedule(customUserNoPerms)).toBe(false)
})

test('canPublish: admin always true', () => {
  expect(canPublish(adminUser)).toBe(true)
})

test('canPublish: respects permissions flag', () => {
  expect(canPublish(customUserWithPerms)).toBe(true)
  expect(canPublish(customUserNoPerms)).toBe(false)
})

test('canViewAnalytics: respects permissions flag', () => {
  expect(canViewAnalytics(adminUser)).toBe(true)
  expect(canViewAnalytics(customUserWithPerms)).toBe(true)
  expect(canViewAnalytics(customUserNoPerms)).toBe(false)
})

test('canManageAccounts: only admin', () => {
  expect(canManageAccounts(adminUser)).toBe(true)
  expect(canManageAccounts(customUserWithPerms)).toBe(false)
  expect(canManageAccounts(customUserNoPerms)).toBe(false)
})
