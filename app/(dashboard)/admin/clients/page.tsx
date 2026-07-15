import { asc, eq } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'
import { ClientsClient } from '@/components/admin/clients/clients-client'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  const profile = await requireAdmin()

  const clients = await db.query.clients.findMany({
    where: eq(tables.clients.company_id, profile.company_id),
    // Excluir los tokens cifrados: nunca deben serializarse al cliente
    with: { social_accounts: { columns: { credentials_enc: false, access_token_enc: false } } },
    orderBy: [asc(tables.clients.name)],
  })

  return (
    <div className="p-6">
      <ClientsClient initialClients={clients} />
    </div>
  )
}
