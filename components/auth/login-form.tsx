// components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validatePassword } from '@/lib/validation'

type Company = { id: string; name: string }

interface LoginFormProps {
  companies: Company[]
}

export function LoginForm({ companies }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register fields
  // Si no hay empresas aún, arrancar directo en "crear empresa nueva"
  const NEW_COMPANY = '__new__'
  const [companyId, setCompanyId] = useState(companies.length === 0 ? NEW_COMPANY : '')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  function handleRegPasswordChange(value: string) {
    setRegPassword(value)
    setPasswordError(value ? validatePassword(value) : null)
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setError(null)
    setPasswordError(null)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Los errores de red (proyecto pausado, sin conexión) no son credenciales inválidas
      const isNetworkError =
        error.name === 'AuthRetryableFetchError' || /fetch/i.test(error.message ?? '')
      setError(
        isNetworkError
          ? 'No se pudo conectar al servidor. Verificá tu conexión y que el proyecto de Supabase esté activo.'
          : 'Correo o contraseña incorrectos.'
      )
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const pwdErr = validatePassword(regPassword)
    if (pwdErr) {
      setPasswordError(pwdErr)
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(companyId === NEW_COMPANY
          ? { new_company_name: newCompanyName }
          : { company_id: companyId }),
        full_name: fullName,
        email: regEmail,
        password: regPassword,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    // Auto-login tras registro exitoso
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: regEmail,
      password: regPassword,
    })

    if (loginError) {
      setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente. Intentá iniciar sesión.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const isRegisterDisabled =
    loading ||
    !companyId ||
    (companyId === NEW_COMPANY && !newCompanyName.trim()) ||
    !fullName.trim() ||
    !regEmail.trim() ||
    !regPassword ||
    !!passwordError

  if (mode === 'login') {
    return (
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>Ingresá tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@agencia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-center text-sm text-zinc-500">
              ¿No tenés cuenta?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-medium text-zinc-900 underline-offset-4 hover:underline"
              >
                Registrate
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Completá tus datos para registrarte</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná tu empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_COMPANY}>+ Crear nueva empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {companyId === NEW_COMPANY && (
            <div className="space-y-2">
              <Label htmlFor="new-company">Nombre de la empresa</Label>
              <Input
                id="new-company"
                type="text"
                placeholder="Mi Agencia"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-zinc-400">
                Vas a ser el administrador de esta empresa
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Correo electrónico</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="tu@agencia.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Contraseña</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={regPassword}
              onChange={(e) => handleRegPasswordChange(e.target.value)}
              required
              disabled={loading}
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            {regPassword && !passwordError && (
              <p className="text-xs text-emerald-600">Contraseña válida</p>
            )}
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isRegisterDisabled}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <p className="text-center text-sm text-zinc-500">
            ¿Ya tenés cuenta?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-medium text-zinc-900 underline-offset-4 hover:underline"
            >
              Iniciá sesión
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
