// app/(dashboard)/admin/accounts/page.tsx
import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/admin/accounts/accounts-client'
import type { Client } from '@/lib/types'
import type { AccountRow } from '@/components/admin/accounts/accounts-client'

export default async function AdminAccountsPage() {
  await requireAdmin()
  const supabase = createClient()

  const [{ data: accountsRaw }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('id, platform, username, is_active, created_at, client:clients(id, name)')
      .order('created_at', { ascending: true }),
    supabase.from('clients').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="p-6">
      <AccountsClient
        initialAccounts={(accountsRaw ?? []) as unknown as AccountRow[]}
        clients={(clientsRaw ?? []) as Client[]}
      />
    </div>
  )
}
