// app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { SocialAccountWithClient, User, Company } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  type ProfileWithCompany = User & { company: Company | null }

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', authUser.id)
    .single()

  const profile = profileRaw as ProfileWithCompany | null

  const { data: rawAccounts } = await supabase
    .from('social_accounts')
    .select('*, client:clients(id, name)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const accounts = (rawAccounts ?? []) as SocialAccountWithClient[]

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar accounts={accounts} userRole={profile?.role ?? 'custom'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
