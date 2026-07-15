import { asc, eq } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'
import { toPublicUser } from '@/lib/auth/user'
import { UsersClient } from '@/components/admin/users/users-client'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const profile = await requireAdmin()

  const users = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.company_id, profile.company_id))
    .orderBy(asc(tables.users.created_at))
    .all()
    .map(toPublicUser)

  const clients = db
    .select()
    .from(tables.clients)
    .where(eq(tables.clients.company_id, profile.company_id))
    .orderBy(asc(tables.clients.name))
    .all()

  return (
    <div className="p-6">
      <UsersClient
        initialUsers={users}
        clients={clients}
        currentUserId={profile.id}
      />
    </div>
  )
}
