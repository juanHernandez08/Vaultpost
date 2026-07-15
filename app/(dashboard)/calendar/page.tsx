// app/(dashboard)/calendar/page.tsx
import { desc, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/user'
import { visibleAccountIds } from '@/lib/db/scope'
import { canSchedule } from '@/lib/permissions'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const profile = await getCurrentUser()
  if (!profile) redirect('/login')

  const accountIds = visibleAccountIds(profile)

  const posts =
    accountIds.length === 0
      ? []
      : await db.query.scheduled_posts.findMany({
          where: inArray(tables.scheduled_posts.social_account_id, accountIds),
          with: {
            social_account: {
              columns: { id: true, platform: true, username: true, client_id: true },
              with: { client: { columns: { id: true, name: true } } },
            },
          },
          orderBy: [desc(tables.scheduled_posts.scheduled_at)],
        })

  const userCanDelete = canSchedule(profile)

  return <CalendarClient posts={posts} canDelete={userCanDelete} />
}
