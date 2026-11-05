import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/session'

export async function POST() {
  destroySession()
  return NextResponse.json({ success: true })
}

// GET: cierre de sesión por redirección. Lo usan los server components cuando
// la cookie es válida pero el usuario ya no existe en la base (sesión huérfana):
// ellos no pueden borrar cookies, así que redirigen acá y de acá a /login.
export async function GET(request: Request) {
  destroySession()
  return NextResponse.redirect(new URL('/login', request.url))
}
