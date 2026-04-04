'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SocialAccountWithClient } from '@/lib/types'
import { cn } from '@/lib/utils'

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook: { bg: 'bg-blue-600', label: 'FB' },
  tiktok: { bg: 'bg-zinc-900', label: 'TK' },
}

const CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'video', label: 'Video' },
]

interface ComposeClientProps {
  accounts: SocialAccountWithClient[]
  userId: string
}

export function ComposeClient({ accounts, userId }: ComposeClientProps) {
  const [accountId, setAccountId] = useState('')
  const [contentType, setContentType] = useState<string>('post')
  const [caption, setCaption] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [status, setStatus] = useState<'scheduled' | 'draft'>('scheduled')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX_CAPTION = 2200

  function resetForm() {
    setAccountId('')
    setContentType('post')
    setCaption('')
    setMediaUrl('')
    setScheduledAt('')
    setStatus('scheduled')
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!accountId) {
      setError('Seleccioná una cuenta')
      return
    }
    if (status === 'scheduled' && !scheduledAt) {
      setError('Ingresá una fecha y hora de publicación')
      return
    }

    setLoading(true)

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        social_account_id: accountId,
        content_type: contentType,
        caption: caption || null,
        media_url: mediaUrl || null,
        scheduled_at: scheduledAt || new Date().toISOString(),
        status,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Error al crear el post')
      toast.error(data.error ?? 'Error al crear el post')
      return
    }

    toast.success(status === 'scheduled' ? 'Post programado exitosamente' : 'Borrador guardado')
    setSuccess(true)
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-500 text-sm">
          No hay cuentas sociales disponibles. Pedile a un administrador que agregue cuentas.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 text-4xl">✅</div>
            <p className="text-lg font-semibold text-zinc-900 mb-1">
              {status === 'scheduled' ? '¡Post programado!' : '¡Borrador guardado!'}
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              {status === 'scheduled'
                ? 'El post se publicará en la fecha programada.'
                : 'Podés editarlo y programarlo desde el Calendario.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={resetForm} variant="outline">
                Crear otro post
              </Button>
              <Button asChild>
                <a href="/calendar">Ver calendario</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Nuevo post</CardTitle>
          <CardDescription>Programá o guardá un borrador de tu publicación</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account */}
            <div className="space-y-2">
              <Label>Cuenta social</Label>
              <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => {
                    const style = PLATFORM_STYLES[a.platform] ?? { bg: 'bg-zinc-400', label: '?' }
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white flex-shrink-0',
                              style.bg
                            )}
                          >
                            {style.label}
                          </span>
                          {a.client?.name ?? 'Cliente'} · @{a.username}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label>Tipo de contenido</Label>
              <Select value={contentType} onValueChange={setContentType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="caption">Caption</Label>
                <span className="text-xs text-zinc-400">
                  {caption.length}/{MAX_CAPTION}
                </span>
              </div>
              <Textarea
                id="caption"
                placeholder="Escribí el texto de tu publicación..."
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Media URL */}
            <div className="space-y-2">
              <Label htmlFor="media-url">URL de media (opcional)</Label>
              <Input
                id="media-url"
                type="url"
                placeholder="https://..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Status toggle */}
            <div className="space-y-2">
              <Label>Acción</Label>
              <div className="flex rounded-md border border-zinc-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStatus('scheduled')}
                  disabled={loading}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    status === 'scheduled'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-500 hover:bg-zinc-50'
                  )}
                >
                  Programar
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  disabled={loading}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    status === 'draft'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-500 hover:bg-zinc-50'
                  )}
                >
                  Guardar borrador
                </button>
              </div>
            </div>

            {/* Scheduled At — only shown if scheduling */}
            {status === 'scheduled' && (
              <div className="space-y-2">
                <Label htmlFor="scheduled-at">Fecha y hora de publicación</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required={status === 'scheduled'}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !accountId}
            >
              {loading
                ? status === 'scheduled' ? 'Programando...' : 'Guardando...'
                : status === 'scheduled' ? 'Programar post' : 'Guardar borrador'
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
