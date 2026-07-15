// app/(auth)/login/page.tsx
import { asc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, tables } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  // Redirigir si ya hay sesión activa
  const userId = await getSessionUserId()
  if (userId) redirect('/')

  // Lista pública de empresas para el selector del registro
  const companies = db
    .select({ id: tables.companies.id, name: tables.companies.name })
    .from(tables.companies)
    .orderBy(asc(tables.companies.name))
    .all()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
              VP
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Vaultpost</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestión de redes sociales</p>
        </div>
        <LoginForm companies={companies} />
      </div>
    </div>
  )
}
