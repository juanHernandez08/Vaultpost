import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// El middleware corre en edge runtime: solo verifica el JWT de la cookie
// (sin tocar la base de datos). La carga del usuario la hacen los guards.
const SESSION_COOKIE = 'vp_session'

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false

  const secret = process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY
  if (!secret) return false

  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api')

  // Rutas de API: cada handler valida sesión individualmente
  // (el cron se autentica con CRON_SECRET, no con sesión)
  if (isApiRoute) return NextResponse.next()

  const authed = await hasValidSession(request)

  // Usuario no autenticado intentando acceder a ruta protegida
  if (!authed && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Usuario autenticado intentando acceder a login
  if (authed && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
