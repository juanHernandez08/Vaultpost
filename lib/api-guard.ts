import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@/lib/types'

type ApiGuardSuccess = { user: User; error: null }
type ApiGuardFailure = { user: null; error: NextResponse }
export type ApiGuardResult = ApiGuardSuccess | ApiGuardFailure

export async function requireAdminApi(): Promise<ApiGuardResult> {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const profile = profileRaw as User | null

  if (!profile || profile.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user: profile, error: null }
}

export async function requireAuthApi(): Promise<ApiGuardResult> {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user: profile, error: null }
}
