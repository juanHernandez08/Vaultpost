// app/(dashboard)/settings/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/user'
import { SettingsClient } from '@/components/settings/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const profile = await getCurrentUser()
  if (!profile) redirect('/api/auth/logout')

  return <SettingsClient user={profile} />
}
