import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComposeClient } from '@/components/compose/compose-client'
import { canSchedule } from '@/lib/permissions'
import type { SocialAccountWithClient, User } from '@/lib/types'

export default async function ComposePage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  if (!canSchedule(profile)) redirect('/')

  // Fetch active social accounts (RLS filters by company)
  const { data: rawAccounts } = await supabase
    .from('social_accounts')
    .select('*, client:clients(id, name)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const accounts = (rawAccounts ?? []) as SocialAccountWithClient[]

  // Non-admin: filter by assigned clients
  const filteredAccounts = profile.role === 'admin'
    ? accounts
    : accounts.filter((a) =>
        (profile.permissions?.clients ?? []).includes(a.client_id)
      )

  return <ComposeClient accounts={filteredAccounts} />
}
