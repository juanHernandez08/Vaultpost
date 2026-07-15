// app/(dashboard)/layout.tsx
import { asc, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getCurrentUserWithCompany } from '@/lib/auth/user'
import { visibleClientIds } from '@/lib/db/scope'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { SocialAccountWithClient } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentUserWithCompany()
  if (!profile) redirect('/login')

  // Perfiles visibles: los de los clientes a los que el usuario tiene acceso
  const clientIds = visibleClientIds(profile)
  const accounts: SocialAccountWithClient[] =
    clientIds.length === 0
      ? []
      : (
          await db.query.social_accounts.findMany({
            // Excluir tokens cifrados: esto se serializa al cliente
            columns: { credentials_enc: false, access_token_enc: false },
            where: inArray(tables.social_accounts.client_id, clientIds),
            with: { client: { columns: { id: true, name: true } } },
            orderBy: [asc(tables.social_accounts.created_at)],
          })
        )
          .filter((a) => a.is_active)
          .map((a) => ({ ...a, client: a.client ?? null }))

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar
        accounts={accounts}
        userRole={profile.role}
        companyName={profile.company?.name ?? ''}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
