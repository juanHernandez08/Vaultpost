// app/(dashboard)/feed/[accountId]/page.tsx
import { and, desc, eq } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/user'
import { visibleClientIds } from '@/lib/db/scope'
import { FeedClient } from '@/components/feed/feed-client'

export const dynamic = 'force-dynamic'

export default async function FeedPage({ params }: { params: { accountId: string } }) {
  const profile = await getCurrentUser()
  if (!profile) redirect('/login')

  const account = await db.query.social_accounts.findFirst({
    columns: { id: true, platform: true, username: true, client_id: true },
    where: eq(tables.social_accounts.id, params.accountId),
    with: { client: { columns: { id: true, name: true } } },
  })

  if (!account) notFound()

  // Check access (empresa + permisos por cliente)
  if (!visibleClientIds(profile).includes(account.client_id)) redirect('/')

  const posts = await db.query.scheduled_posts.findMany({
    columns: { id: true, content_type: true, caption: true, media_url: true, scheduled_at: true },
    where: and(
      eq(tables.scheduled_posts.social_account_id, params.accountId),
      eq(tables.scheduled_posts.status, 'published')
    ),
    with: { post_metrics: true },
    orderBy: [desc(tables.scheduled_posts.scheduled_at)],
  })

  return <FeedClient account={account} posts={posts} />
}
