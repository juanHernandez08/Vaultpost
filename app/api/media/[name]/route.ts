// app/api/media/[name]/route.ts — sirve las imágenes subidas.
// Público a propósito: Instagram descarga la imagen desde esta URL (vía túnel).
// Los nombres son UUIDs aleatorios, no enumerables.
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads')

export async function GET(
  _request: Request,
  { params }: { params: { name: string } }
) {
  // Anti path-traversal: solo nombres de archivo planos generados por /api/upload
  if (!/^[a-f0-9-]{36}\.jpg$/.test(params.name)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, params.name))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
