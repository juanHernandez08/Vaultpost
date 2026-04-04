# User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un toggle de registro en la página de login que permite a empleados de una empresa registrarse eligiendo su compañía de un dropdown, con rol automático (primer usuario → admin, resto → custom) y validación de contraseña.

**Architecture:** Server component fetcha la lista de companies con adminClient y la pasa como prop al LoginForm client component. Un nuevo endpoint público `/api/auth/register` maneja la creación de usuarios con lógica de roles. El LoginForm maneja el toggle login/registro con estado local.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase admin client, shadcn/ui (Select, Input, Label, Button, Card), Sonner (toasts).

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `app/api/auth/register/route.ts` | Endpoint POST público — valida, determina rol, crea auth user + public.users |
| Modificar | `app/(auth)/login/page.tsx` | Server component async — fetcha companies, actualiza header |
| Modificar | `components/auth/login-form.tsx` | Acepta companies prop, agrega toggle + formulario de registro |

---

## Task 1: Endpoint POST /api/auth/register

**Files:**
- Create: `app/api/auth/register/route.ts`

- [ ] **Step 1: Crear el directorio y el archivo**

```bash
mkdir -p "app/api/auth/register"
```

- [ ] **Step 2: Escribir el endpoint**

```typescript
// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
  return null
}

export async function POST(request: Request) {
  const body = await request.json()
  const { company_id, full_name, email, password } = body

  // Validar campos requeridos
  if (!company_id || !full_name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: 'company_id, full_name, email y password son requeridos' },
      { status: 400 }
    )
  }

  // Validar contraseña
  const passwordError = validatePassword(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verificar que la empresa existe
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 400 })
  }

  // Determinar rol: primer usuario de la empresa → admin, resto → custom
  const { count } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company_id)

  const role: UserRole = (count ?? 0) === 0 ? 'admin' : 'custom'

  // Crear usuario en auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError) {
    console.error('[POST /api/auth/register] createUser:', authError.message)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insertar en public.users
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      company_id,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
      permissions: {},
    })
    .select()
    .single()

  if (userError) {
    // Rollback: eliminar el auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.error('[POST /api/auth/register] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat: public register endpoint with role auto-assignment"
```

---

## Task 2: Actualizar login page — header + companies fetch

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Reemplazar el contenido completo de la página**

```typescript
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
```

- [ ] **Step 2: Verificar que la página compila**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: login page fetches companies server-side, updates OmniMark branding"
```

---

## Task 3: Actualizar LoginForm con toggle y formulario de registro

**Files:**
- Modify: `components/auth/login-form.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del componente**

```typescript
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

type Company = { id: string; name: string }

interface LoginFormProps {
  companies: Company[]
}

function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Mínimo 8 caracteres, una mayúscula y un número'
  }
  return null
}

export function LoginForm({ companies }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register fields
  const [companyId, setCompanyId] = useState('')
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
      setError('Correo o contraseña incorrectos.')
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
        company_id: companyId,
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
              </SelectContent>
            </Select>
          </div>
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
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | tail -20
```

Expected: build exitoso, 0 errores TypeScript.

- [ ] **Step 4: Commit final**

```bash
git add components/auth/login-form.tsx
git commit -m "feat: login/register toggle with company selector and password validation"
```

- [ ] **Step 5: Push**

```bash
git push
```
