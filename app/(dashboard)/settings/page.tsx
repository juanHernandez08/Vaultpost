// app/(dashboard)/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/settings-client'
import type { User } from '@/lib/types'

export default async function SettingsPage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  return <SettingsClient user={profile} />
}
