// components/analytics/analytics-client.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostMetrics } from '@/lib/types'

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

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook: { bg: 'bg-blue-600', label: 'FB' },
  tiktok: { bg: 'bg-zinc-900', label: 'TK' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function getLatestMetrics(metrics: PostMetrics[]): PostMetrics | null {
  if (!metrics.length) return null
  return metrics.reduce((latest, m) =>
    new Date(m.fetched_at) > new Date(latest.fetched_at) ? m : latest
  )
}

interface AnalyticsClientProps {
  posts: PostWithMetrics[]
}

export function AnalyticsClient({ posts }: AnalyticsClientProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('all')

  // Get unique accounts for filter
  const accounts = Array.from(
    new Map(
      posts
        .filter((p) => p.social_account)
        .map((p) => [
          p.social_account!.id,
          { id: p.social_account!.id, username: p.social_account!.username, platform: p.social_account!.platform },
        ])
    ).values()
  )

  const filteredPosts = selectedAccount === 'all'
    ? posts
    : posts.filter((p) => p.social_account?.id === selectedAccount)

  // Aggregate metrics
  const postsWithMetrics = filteredPosts.filter((p) => p.post_metrics.length > 0)
  const totals = postsWithMetrics.reduce(
    (acc, post) => {
      const m = getLatestMetrics(post.post_metrics)!
      return {
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        reach: acc.reach + m.reach,
        engagement: acc.engagement + m.engagement_rate,
      }
    },
    { likes: 0, comments: 0, shares: 0, reach: 0, engagement: 0 }
  )

  const avgEngagement = postsWithMetrics.length > 0
    ? (totals.engagement / postsWithMetrics.length).toFixed(2)
    : '0.00'

  const summaryCards = [
    { label: 'Posts publicados', value: filteredPosts.length },
    { label: 'Total Likes', value: totals.likes.toLocaleString('es-AR') },
    { label: 'Total Alcance', value: totals.reach.toLocaleString('es-AR') },
    { label: 'Engagement Prom.', value: `${avgEngagement}%` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-500">Métricas de tus publicaciones</p>
        </div>
        {/* Account filter */}
        {accounts.length > 1 && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.username} ({a.platform})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-zinc-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-zinc-500 text-sm">Sin posts publicados aún.</p>
          <p className="text-xs text-zinc-400 mt-1">Los posts publicados mostrarán sus métricas aquí.</p>
        </div>
      )}

      {/* Posts table */}
      {filteredPosts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Cuenta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Caption</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Likes</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Comments</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Shares</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Alcance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Eng%</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => {
                const account = post.social_account
                const style = account ? (PLATFORM_STYLES[account.platform] ?? { bg: 'bg-zinc-400', label: '?' }) : { bg: 'bg-zinc-400', label: '?' }
                const metrics = getLatestMetrics(post.post_metrics)

                return (
                  <tr key={post.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                      {formatDate(post.scheduled_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold text-white',
                            style.bg
                          )}
                        >
                          {style.label}
                        </div>
                        <span className="text-zinc-700 whitespace-nowrap">
                          @{account?.username ?? '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{post.content_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[200px]">
                      <p className="truncate">{post.caption ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">{metrics?.likes ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">{metrics?.comments ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">{metrics?.shares ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">{metrics?.reach ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {metrics ? `${metrics.engagement_rate.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
