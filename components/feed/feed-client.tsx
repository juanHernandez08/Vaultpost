// components/feed/feed-client.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ImageIcon, Heart, MessageCircle, Users } from 'lucide-react'
import type { PostMetrics } from '@/lib/types'

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
  client: { name: string } | null
}

const PLATFORM_STYLES: Record<string, { bg: string; label: string; name: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG', name: 'Instagram' },
  facebook: { bg: 'bg-blue-600', label: 'FB', name: 'Facebook' },
  tiktok: { bg: 'bg-zinc-900', label: 'TK', name: 'TikTok' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getLatestMetrics(metrics: PostMetrics[]): PostMetrics | null {
  if (!metrics.length) return null
  return metrics.reduce((latest, m) =>
    new Date(m.fetched_at) > new Date(latest.fetched_at) ? m : latest
  )
}

interface FeedClientProps {
  account: AccountInfo
  posts: FeedPost[]
}

export function FeedClient({ account, posts }: FeedClientProps) {
  const platformStyle = PLATFORM_STYLES[account.platform] ?? { bg: 'bg-zinc-400', label: '?', name: account.platform }

  return (
    <div className="space-y-6">
      {/* Account header */}
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-200">
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white',
            platformStyle.bg
          )}
        >
          {platformStyle.label}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">@{account.username}</h1>
            <Badge variant="secondary">{platformStyle.name}</Badge>
            <Badge variant="green">Activa</Badge>
          </div>
          <p className="text-sm text-zinc-500">{account.client?.name ?? 'Cliente'}</p>
        </div>
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-zinc-500 text-sm">Esta cuenta no tiene publicaciones aún.</p>
        </div>
      )}

      {/* Posts grid */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const metrics = getLatestMetrics(post.post_metrics)
            return (
              <div
                key={post.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                {/* Media area */}
                <div className="aspect-square bg-zinc-100 flex items-center justify-center relative">
                  {post.media_url ? (
                    <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.media_url}
                        alt={post.caption ?? 'Post'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            const fallback = document.createElement('div')
                            fallback.className = 'flex items-center justify-center w-full h-full'
                            fallback.innerHTML = '<svg class="h-10 w-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    </a>
                  ) : (
                    <ImageIcon className="h-10 w-10 text-zinc-300" />
                  )}
                  {/* Content type badge overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="default">{post.content_type}</Badge>
                  </div>
                </div>

                {/* Post info */}
                <div className="p-3">
                  {post.caption && (
                    <p className="text-sm text-zinc-700 line-clamp-3 mb-2">{post.caption}</p>
                  )}
                  <p className="text-xs text-zinc-400 mb-2">{formatDate(post.scheduled_at)}</p>

                  {/* Metrics */}
                  {metrics && (
                    <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Heart className="h-3.5 w-3.5" />
                        {metrics.likes.toLocaleString('es-AR')}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {metrics.comments.toLocaleString('es-AR')}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Users className="h-3.5 w-3.5" />
                        {metrics.reach.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
