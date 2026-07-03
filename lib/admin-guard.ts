import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User, Company } from '@/lib/types'

export type ProfileWithCompany = User & { company: Company | null }

export async function requireAdmin(): Promise<ProfileWithCompany> {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*, company:companies!users_company_id_fkey(*)')
    .eq('id', authUser.id)
    .single()

  const profile = profileRaw as ProfileWithCompany | null

  if (!profile || profile.role !== 'admin') redirect('/')

  return profile
}
