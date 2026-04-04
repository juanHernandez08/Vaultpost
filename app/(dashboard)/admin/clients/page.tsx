import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-guard'
import { ClientsClient } from '@/components/admin/clients/clients-client'
import type { Client } from '@/lib/types'

export default async function AdminClientsPage() {
  await requireAdmin()
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-6">
      <ClientsClient initialClients={(clients ?? []) as Client[]} />
    </div>
  )
}
