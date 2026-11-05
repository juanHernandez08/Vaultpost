import { asc, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/user'
import { visibleClientIds } from '@/lib/db/scope'
import { canSchedule } from '@/lib/permissions'
import { ComposeClient } from '@/components/compose/compose-client'
import type { SocialAccountWithClient } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ComposePage() {
  const profile = await getCurrentUser()
  if (!profile) redirect('/api/auth/logout')

  if (!canSchedule(profile)) redirect('/')

  const clientIds = await visibleClientIds(profile)
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

  return <ComposeClient accounts={accounts} />
}
