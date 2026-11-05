// app/(dashboard)/analytics/page.tsx
import { and, desc, eq, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/user'
import { visibleAccountIds } from '@/lib/db/scope'
import { canViewAnalytics } from '@/lib/permissions'
import { AnalyticsClient } from '@/components/analytics/analytics-client'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const profile = await getCurrentUser()
  if (!profile) redirect('/api/auth/logout')

  if (!canViewAnalytics(profile)) redirect('/')

  const accountIds = await visibleAccountIds(profile)

  const posts =
    accountIds.length === 0
      ? []
      : await db.query.scheduled_posts.findMany({
          columns: { id: true, content_type: true, caption: true, scheduled_at: true },
          where: and(
            inArray(tables.scheduled_posts.social_account_id, accountIds),
            eq(tables.scheduled_posts.status, 'published')
          ),
          with: {
            social_account: {
              columns: { id: true, platform: true, username: true, client_id: true },
              with: { client: { columns: { id: true, name: true } } },
            },
            post_metrics: true,
          },
          orderBy: [desc(tables.scheduled_posts.scheduled_at)],
        })

  return <AnalyticsClient posts={posts} />
}
