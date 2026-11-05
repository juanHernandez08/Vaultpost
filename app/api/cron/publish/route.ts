// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server'
import { and, eq, lte } from 'drizzle-orm'
import { db, tables } from '@/lib/db'
import { publishToInstagram } from '@/lib/publish/instagram'

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

  // Posts vencidos, con la cuenta (plataforma + token) para publicar de verdad
  const posts = await db.query.scheduled_posts.findMany({
    columns: { id: true, content_type: true, caption: true, media_url: true },
    where: and(
      eq(tables.scheduled_posts.status, 'scheduled'),
      lte(tables.scheduled_posts.scheduled_at, now)
    ),
    with: {
      social_account: {
        columns: { id: true, platform: true, username: true, access_token_enc: true },
      },
    },
  })

  if (posts.length === 0) {
    return NextResponse.json({ published: 0, failed: 0 })
  }

  let published = 0
  let failed = 0

  for (const post of posts) {
    await db
      .update(tables.scheduled_posts)
      .set({ status: 'publishing' })
      .where(eq(tables.scheduled_posts.id, post.id))

    try {
      const account = post.social_account

      if (account?.platform === 'instagram' && account.access_token_enc) {
        // Publicación REAL vía Instagram API
        await publishToInstagram({
          accessTokenEnc: account.access_token_enc,
          contentType: post.content_type,
          caption: post.caption,
          mediaUrl: post.media_url,
        })
      }
      // Cuentas sin token (o Facebook/TikTok): simulación — se marca como
      // publicado sin llamar a APIs externas (integración fase 2)

      await db
        .update(tables.scheduled_posts)
        .set({ status: 'published', error_msg: null })
        .where(eq(tables.scheduled_posts.id, post.id))

      published++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`[CRON] Post ${post.id} failed:`, msg)

      await db
        .update(tables.scheduled_posts)
        .set({ status: 'failed', error_msg: msg })
        .where(eq(tables.scheduled_posts.id, post.id))

      failed++
    }
  }

  console.log(`[CRON] published=${published} failed=${failed}`)
  return NextResponse.json({ published, failed })
}
