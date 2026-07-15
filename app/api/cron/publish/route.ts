// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server'
import { and, eq, lte } from 'drizzle-orm'
import { db, tables } from '@/lib/db'

// Vercel Cron invoca con GET; POST queda disponible para disparos manuales
export async function GET(request: Request) {
  return runPublish(request)
}

export async function POST(request: Request) {
  return runPublish(request)
}

async function runPublish(request: Request) {
  // Authenticate the cron job
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find posts ready to publish
  const posts = db
    .select({ id: tables.scheduled_posts.id })
    .from(tables.scheduled_posts)
    .where(and(eq(tables.scheduled_posts.status, 'scheduled'), lte(tables.scheduled_posts.scheduled_at, now)))
    .all()

  if (posts.length === 0) {
    return NextResponse.json({ published: 0, failed: 0 })
  }

  let published = 0
  let failed = 0

  for (const post of posts) {
    // Mark as publishing
    db.update(tables.scheduled_posts)
      .set({ status: 'publishing' })
      .where(eq(tables.scheduled_posts.id, post.id))
      .run()

    try {
      // Phase 1: simulation (no real API integration yet)
      // Phase 2: call Instagram/Facebook/TikTok API here

      db.update(tables.scheduled_posts)
        .set({ status: 'published', error_msg: null })
        .where(eq(tables.scheduled_posts.id, post.id))
        .run()

      published++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`[CRON] Post ${post.id} failed:`, msg)

      db.update(tables.scheduled_posts)
        .set({ status: 'failed', error_msg: msg })
        .where(eq(tables.scheduled_posts.id, post.id))
        .run()

      failed++
    }
  }

  console.log(`[CRON] published=${published} failed=${failed}`)
  return NextResponse.json({ published, failed })
}
