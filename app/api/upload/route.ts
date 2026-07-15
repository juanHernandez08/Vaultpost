// app/api/upload/route.ts — subir imagen para un post
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule } from '@/lib/permissions'

// Instagram solo acepta JPEG vía image_url; limitamos a eso para evitar
// publicaciones fallidas. 8 MB es el límite de Meta para imágenes.
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg'])

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads')

export async function POST(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para subir media' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Se esperaba multipart/form-data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el campo "file"' }, { status: 400 })
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Solo se aceptan imágenes JPEG (Instagram no procesa otros formatos por URL)' },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera el máximo de 8 MB' }, { status: 400 })
  }

  const name = `${crypto.randomUUID()}.jpg`
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ url: `/api/media/${name}` }, { status: 201 })
}
