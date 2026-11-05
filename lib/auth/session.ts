// lib/auth/session.ts
// Sesiones con JWT firmado (HS256) en cookie httpOnly.
// Usa `jose` (puro JS) para que la verificación también funcione en el
// middleware (edge runtime), donde el driver de PostgreSQL no está disponible.
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'vp_session'
const SESSION_DURATION_S = 60 * 60 * 24 * 7 // 7 días

export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('SESSION_SECRET (o ENCRYPTION_KEY) no está definida en las variables de entorno')
  }
  return new TextEncoder().encode(secret)
}

/** Crea la sesión y setea la cookie. Solo llamar desde Route Handlers. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(getSessionSecret())

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_S,
    path: '/',
  })
}

/** Borra la cookie de sesión. Solo llamar desde Route Handlers. */
export function destroySession(): void {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

/** Devuelve el userId de la sesión activa, o null si no hay o es inválida. */
export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSessionSecret())
    return payload.sub ?? null
  } catch {
    return null
  }
}

/** Verifica un token crudo (para el middleware, que no usa cookies()). */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSessionSecret())
    return true
  } catch {
    return false
  }
}
