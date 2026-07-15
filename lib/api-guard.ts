import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import type { User } from '@/lib/types'

type ApiGuardSuccess = { user: User; error: null }
type ApiGuardFailure = { user: null; error: NextResponse }
export type ApiGuardResult = ApiGuardSuccess | ApiGuardFailure

export async function requireAuthApi(): Promise<ApiGuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user, error: null }
}

export async function requireAdminApi(): Promise<ApiGuardResult> {
  const guard = await requireAuthApi()
  if (guard.error) return guard

  if (guard.user.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return guard
}
