// app/(dashboard)/analytics/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { canViewAnalytics, canViewClient } from '@/lib/permissions'
import type { PostMetrics, User } from '@/lib/types'

type PostWithMetrics = {
  id: string
  content_type: string
  caption: string | null
  scheduled_at: string
  social_account: {
    id: string
    platform: string
    username: string
    client_id: string
    client: { id: string; name: string } | null
  } | null
  post_metrics: PostMetrics[]
}

export default async function AnalyticsPage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  if (!canViewAnalytics(profile)) redirect('/')

  // Fetch published posts with metrics
  const { data: rawPosts } = await supabase
    .from('scheduled_posts')
    .select('id, content_type, caption, scheduled_at, social_account:social_accounts(id, platform, username, client_id, client:clients(id, name)), post_metrics(*)')
    .eq('status', 'published')
    .order('scheduled_at', { ascending: false })

  const allPosts = (rawPosts ?? []) as PostWithMetrics[]

  // Filter by canViewClient for non-admins
  const posts = profile.role === 'admin'
    ? allPosts
    : allPosts.filter((p) => {
        const clientId = p.social_account?.client_id
        return clientId ? canViewClient(profile, clientId) : false
      })

  return <AnalyticsClient posts={posts} />
}
