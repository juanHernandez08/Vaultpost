// app/(auth)/login/page.tsx
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  // Redirigir si ya hay sesión activa
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  // Fetchar companies con adminClient (sin RLS — lista pública para el registro)
  const adminClient = createAdminClient()
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true })

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
              OM
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">OmniMark</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestión de redes sociales</p>
        </div>
        <LoginForm companies={companies ?? []} />
      </div>
    </div>
  )
}
