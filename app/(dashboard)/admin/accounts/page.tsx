// app/(dashboard)/admin/accounts/page.tsx
import { asc, eq, inArray } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'
import { companyClientIds } from '@/lib/db/scope'
import { AccountsClient } from '@/components/admin/accounts/accounts-client'
import type { AccountRow } from '@/components/admin/accounts/accounts-client'

export const dynamic = 'force-dynamic'

export default async function AdminAccountsPage() {
  const profile = await requireAdmin()

  const accountsRaw = await db.query.social_accounts.findMany({
    columns: { id: true, platform: true, username: true, is_active: true, created_at: true },
    where: inArray(tables.social_accounts.client_id, companyClientIds(profile.company_id)),
    with: { client: { columns: { id: true, name: true } } },
    orderBy: [asc(tables.social_accounts.created_at)],
  })

  const clients = db
    .select()
    .from(tables.clients)
    .where(eq(tables.clients.company_id, profile.company_id))
    .orderBy(asc(tables.clients.name))
    .all()

  return (
    <div className="p-6">
      <AccountsClient
        initialAccounts={accountsRaw as unknown as AccountRow[]}
        clients={clients}
      />
    </div>
  )
}
