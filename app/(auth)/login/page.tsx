// app/(auth)/login/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="mb-3 text-5xl">🌸</div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pascuas</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestión de redes sociales</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
