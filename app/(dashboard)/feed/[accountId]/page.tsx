// app/(dashboard)/feed/[accountId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { FeedClient } from '@/components/feed/feed-client'
import { canViewClient } from '@/lib/permissions'
import type { PostMetrics, User } from '@/lib/types'

type FeedPost = {
  id: string
  content_type: string
  caption: string | null
  media_url: string | null
  scheduled_at: string
  post_metrics: PostMetrics[]
}

type AccountInfo = {
  id: string
  platform: string
  username: string
  client_id: string
  client: { id: string; name: string } | null
}

export default async function FeedPage({ params }: { params: { accountId: string } }) {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  // Fetch account info
  const { data: accountRaw, error: accountError } = await supabase
    .from('social_accounts')
    .select('id, platform, username, client_id, client:clients(id, name)')
    .eq('id', params.accountId)
    .single()

  if (accountError || !accountRaw) notFound()

  const account = accountRaw as AccountInfo

  // Check access
  if (!canViewClient(profile, account.client_id)) redirect('/')

  // Fetch published posts for this account
  const { data: rawPosts } = await supabase
    .from('scheduled_posts')
    .select('id, content_type, caption, media_url, scheduled_at, post_metrics(*)')
    .eq('social_account_id', params.accountId)
    .eq('status', 'published')
    .order('scheduled_at', { ascending: false })

  const posts = (rawPosts ?? []) as FeedPost[]

  return <FeedClient account={account} posts={posts} />
}
