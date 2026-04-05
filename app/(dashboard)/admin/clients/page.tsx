import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-guard'
import { ClientsClient } from '@/components/admin/clients/clients-client'
import type { Client, SocialAccount } from '@/lib/types'

type ClientWithAccounts = Client & { social_accounts: SocialAccount[] }

export default async function AdminClientsPage() {
  await requireAdmin()
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, social_accounts(*)')
    .order('name', { ascending: true })

  return (
    <div className="p-6">
      <ClientsClient initialClients={(clients ?? []) as ClientWithAccounts[]} />
    </div>
  )
}
