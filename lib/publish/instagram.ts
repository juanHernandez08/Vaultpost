// lib/publish/instagram.ts
// Publicación real vía Instagram API (Instagram Login / cuentas profesionales).
// Flujo de Meta: crear un "contenedor" de media → esperar procesamiento → publicar.
// La imagen debe estar en una URL pública (Meta la descarga); ver PUBLIC_BASE_URL.
import { decrypt } from '@/lib/crypto'

const GRAPH = 'https://graph.instagram.com/v23.0'

type PublishInput = {
  accessTokenEnc: string
  contentType: 'post' | 'reel' | 'story' | 'video'
  caption: string | null
  mediaUrl: string | null
}

class InstagramError extends Error {}

/** Convierte una media_url relativa (/api/media/x.jpg) en URL pública absoluta. */
function resolvePublicUrl(mediaUrl: string): string {
  if (/^https?:\/\//i.test(mediaUrl)) {
    if (/localhost|127\.0\.0\.1/.test(mediaUrl)) {
      throw new InstagramError(
        'Instagram no puede descargar imágenes de localhost. Configurá PUBLIC_BASE_URL con tu URL de túnel (ngrok/cloudflared).'
      )
    }
    return mediaUrl
  }
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '')
  if (!base) {
    throw new InstagramError(
      'Falta PUBLIC_BASE_URL en .env.local: Instagram necesita una URL pública para descargar la imagen (usá un túnel como ngrok o cloudflared).'
    )
  }
  return `${base}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`
}

async function igFetch(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${GRAPH}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = data.error as { message?: string; error_user_msg?: string } | undefined
    throw new InstagramError(err?.error_user_msg ?? err?.message ?? `Instagram API ${res.status}`)
  }
  return data
}

async function igGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${GRAPH}${path}?${qs}`)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined
    throw new InstagramError(err?.message ?? `Instagram API ${res.status}`)
  }
  return data
}

/**
 * Publica un post/story de imagen en Instagram. Lanza Error con mensaje
 * legible si algo falla (queda registrado en error_msg del post).
 */
export async function publishToInstagram(input: PublishInput): Promise<void> {
  const accessToken = decrypt(input.accessTokenEnc)

  if (input.contentType === 'reel' || input.contentType === 'video') {
    throw new InstagramError('Publicación de video/reel aún no soportada (fase 2)')
  }
  if (!input.mediaUrl) {
    throw new InstagramError('Instagram requiere una imagen (media_url) para publicar')
  }

  const imageUrl = resolvePublicUrl(input.mediaUrl)

  // 1. Identificar la cuenta profesional del token
  const me = await igGet('/me', { fields: 'id,username', access_token: accessToken })
  const igUserId = me.id as string

  // 2. Crear el contenedor de media
  const containerParams: Record<string, string> = {
    access_token: accessToken,
    image_url: imageUrl,
  }
  if (input.contentType === 'story') {
    containerParams.media_type = 'STORIES'
  } else if (input.caption) {
    containerParams.caption = input.caption
  }

  const container = await igFetch(`/${igUserId}/media`, containerParams)
  const creationId = container.id as string

  // 3. Esperar a que Meta procese la imagen (las imágenes suelen ser inmediatas)
  for (let i = 0; i < 10; i++) {
    const status = await igGet(`/${creationId}`, {
      fields: 'status_code',
      access_token: accessToken,
    })
    if (status.status_code === 'FINISHED') break
    if (status.status_code === 'ERROR') {
      throw new InstagramError('Instagram no pudo procesar la imagen (¿es JPEG y accesible públicamente?)')
    }
    await new Promise((r) => setTimeout(r, 3000))
  }

  // 4. Publicar
  await igFetch(`/${igUserId}/media_publish`, {
    access_token: accessToken,
    creation_id: creationId,
  })
}
