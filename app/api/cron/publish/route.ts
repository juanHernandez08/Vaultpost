// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // Authenticate the cron job
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // Find posts ready to publish
  const { data: posts, error: fetchError } = await adminClient
    .from('scheduled_posts')
    .select('id, social_account_id, content_type, caption, media_url')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (fetchError) {
    console.error('[CRON /api/cron/publish] fetch:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ published: 0, failed: 0 })
  }

  let published = 0
  let failed = 0

  for (const post of posts) {
    // Mark as publishing
    await adminClient
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    try {
      // Phase 1: simulation (no real API integration yet)
      // Phase 2: call Instagram/Facebook/TikTok API here

      await adminClient
        .from('scheduled_posts')
        .update({ status: 'published', error_msg: null })
        .eq('id', post.id)

      published++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`[CRON] Post ${post.id} failed:`, msg)

      await adminClient
        .from('scheduled_posts')
        .update({ status: 'failed', error_msg: msg })
        .eq('id', post.id)

      failed++
    }
  }

  console.log(`[CRON] published=${published} failed=${failed}`)
  return NextResponse.json({ published, failed })
}
