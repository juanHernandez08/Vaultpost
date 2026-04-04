// app/(dashboard)/calendar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/calendar-client'
import { canSchedule, canViewClient } from '@/lib/permissions'
import type { ScheduledPost, User } from '@/lib/types'

type PostWithAccount = ScheduledPost & {
  social_account: {
    id: string
    platform: string
    username: string
    client_id: string
    client: { id: string; name: string } | null
  } | null
}

export default async function CalendarPage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  // Fetch all posts with account + client info (RLS filters by company)
  const { data: rawPosts } = await supabase
    .from('scheduled_posts')
    .select('*, social_account:social_accounts(id, platform, username, client_id, client:clients(id, name))')
    .order('scheduled_at', { ascending: false })

  const allPosts = (rawPosts ?? []) as PostWithAccount[]

  // Filter by canViewClient for non-admins
  const posts = profile.role === 'admin'
    ? allPosts
    : allPosts.filter((p) => {
        const clientId = p.social_account?.client_id
        return clientId ? canViewClient(profile, clientId) : false
      })

  const userCanDelete = canSchedule(profile)

  return <CalendarClient posts={posts} canDelete={userCanDelete} />
}
