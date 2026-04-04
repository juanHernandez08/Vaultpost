# Pascuas Webapp — Admin Panel (Plan 2/3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el panel de administración completo de Pascuas: gestión de usuarios con permisos granulares, gestión de clientes y gestión de cuentas sociales (con credenciales cifradas).

**Architecture:** Cada sección del admin (`/admin/users`, `/admin/clients`, `/admin/accounts`) sigue el patrón Server Component (fetching inicial) + Client Component (interactividad). Las API routes validan sesión + rol admin antes de operar. Las credenciales sociales nunca viajan al navegador: la API solo devuelve campos no sensibles. El Supabase admin client (service role) se usa exclusivamente en el servidor para operaciones privilegiadas (crear/borrar auth.users).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Supabase SSR + Admin, Sonner (toasts), `@supabase/supabase-js` admin client, `lucide-react`.

---

## Mapa de Archivos

```
app/
├── api/
│   ├── users/
│   │   ├── route.ts                         # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts                     # DELETE
│   │       └── permissions/
│   │           └── route.ts                 # PATCH
│   ├── clients/
│   │   ├── route.ts                         # GET, POST
│   │   └── [id]/
│   │       └── route.ts                     # PATCH, DELETE
│   └── accounts/
│       ├── route.ts                         # GET, POST (cifra credenciales)
│       └── [id]/
│           └── route.ts                     # DELETE
└── (dashboard)/
    └── admin/
        ├── users/page.tsx                   # Server component — fetch + render UsersClient
        ├── clients/page.tsx                 # Server component — fetch + render ClientsClient
        └── accounts/page.tsx               # Server component — fetch + render AccountsClient

components/
└── admin/
    ├── users/
    │   └── users-client.tsx                 # Client component — tabla + dialogs CRUD
    ├── clients/
    │   └── clients-client.tsx               # Client component — tabla + dialog CRUD
    └── accounts/
        └── accounts-client.tsx              # Client component — tabla + dialog crear/borrar

components/ui/
├── dialog.tsx                               # Radix Dialog wrapper
├── select.tsx                               # Radix Select wrapper
├── checkbox.tsx                             # Radix Checkbox wrapper
└── table.tsx                                # HTML table con clases Tailwind

lib/
├── supabase/
│   └── admin.ts                             # createAdminClient() — service role, servidor only
├── admin-guard.ts                           # requireAdmin() — page guard (redirect si no admin)
└── api-guard.ts                             # requireAdminApi() — API guard (return 401/403)
```

---

## Task 1: Nuevos componentes UI + dependencias

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app/layout.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/select.tsx`
- Create: `components/ui/checkbox.tsx`
- Create: `components/ui/table.tsx`

- [ ] **Step 1: Instalar dependencias**

```bash
cd "C:\Users\Usuario\Documents\Trabajos Externos\Proyectos personales\Pascuas"
npm install sonner @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-checkbox
```

Expected: `added N packages` sin errores.

- [ ] **Step 2: Agregar Sonner Toaster al root layout**

Leer `app/layout.tsx` y modificar para agregar el provider:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: 'Pascuas',
  description: 'Gestión profesional de redes sociales para agencias',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Crear `components/ui/dialog.tsx`**

```tsx
// components/ui/dialog.tsx
'use client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2">
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5', className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-zinc-900', className)}
      {...props}
    />
  )
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle }
```

- [ ] **Step 4: Crear `components/ui/select.tsx`**

```tsx
// components/ui/select.tsx
'use client'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        position="popper"
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
```

- [ ] **Step 5: Crear `components/ui/checkbox.tsx`**

```tsx
// components/ui/checkbox.tsx
'use client'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-zinc-300 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-zinc-900 data-[state=checked]:text-white data-[state=checked]:border-zinc-900',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
```

- [ ] **Step 6: Crear `components/ui/table.tsx`**

```tsx
// components/ui/table.tsx
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b border-zinc-200', className)} {...props} />
}

function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-zinc-100 transition-colors hover:bg-zinc-50/50', className)}
      {...props}
    />
  )
}

function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium text-zinc-500 uppercase tracking-wide',
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 8: Commit**

```bash
git add components/ui/dialog.tsx components/ui/select.tsx components/ui/checkbox.tsx components/ui/table.tsx app/layout.tsx package.json package-lock.json
git commit -m "feat: add dialog, select, checkbox, table components and sonner toasts"
```

---

## Task 2: Supabase admin client + guards

**Files:**
- Create: `lib/supabase/admin.ts`
- Create: `lib/admin-guard.ts`
- Create: `lib/api-guard.ts`

- [ ] **Step 1: Crear `lib/supabase/admin.ts`**

Este cliente usa el service role key — **nunca importar en componentes cliente**.

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Step 2: Crear `lib/admin-guard.ts`**

Guard para Server Components y layouts: redirige si el usuario no es admin.

```typescript
// lib/admin-guard.ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User, Company } from '@/lib/types'

export type ProfileWithCompany = User & { company: Company | null }

export async function requireAdmin(): Promise<ProfileWithCompany> {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', authUser.id)
    .single()

  const profile = profileRaw as ProfileWithCompany | null

  if (!profile || profile.role !== 'admin') redirect('/')

  return profile
}
```

- [ ] **Step 3: Crear `lib/api-guard.ts`**

Guard para API routes: devuelve 401/403 en lugar de redirigir.

```typescript
// lib/api-guard.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@/lib/types'

type ApiGuardSuccess = { user: User; error: null }
type ApiGuardFailure = { user: null; error: NextResponse }
export type ApiGuardResult = ApiGuardSuccess | ApiGuardFailure

export async function requireAdminApi(): Promise<ApiGuardResult> {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const profile = profileRaw as User | null

  if (!profile || profile.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user: profile, error: null }
}
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/admin.ts lib/admin-guard.ts lib/api-guard.ts
git commit -m "feat: supabase admin client, page guard and api guard"
```

---

## Task 3: Users API routes

**Files:**
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[id]/route.ts`
- Create: `app/api/users/[id]/permissions/route.ts`

- [ ] **Step 1: Crear `app/api/users/route.ts`** (GET list + POST create)

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/users]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const body = await request.json()
  const { email, full_name, password, role = 'custom' } = body

  if (!email?.trim() || !full_name?.trim() || !password) {
    return NextResponse.json(
      { error: 'email, full_name y password son requeridos' },
      { status: 400 }
    )
  }

  if (!['admin', 'custom'].includes(role)) {
    return NextResponse.json({ error: 'role debe ser admin o custom' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 1. Crear usuario en auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Insertar en public.users (auth.users ON DELETE CASCADE lo limpia si falla)
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      company_id: guard.user.company_id,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
      permissions: {},
    })
    .select()
    .single()

  if (userError) {
    // Rollback: eliminar el auth user creado
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.error('[POST /api/users] insert user:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
```

- [ ] **Step 2: Crear `app/api/users/[id]/route.ts`** (DELETE)

```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  if (params.id === guard.user.id) {
    return NextResponse.json(
      { error: 'No puedes eliminarte a ti mismo' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // Verificar que el usuario pertenece a la misma empresa
  const { data: target } = await adminClient
    .from('users')
    .select('id, company_id')
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Eliminar de auth.users (ON DELETE CASCADE limpia public.users)
  const { error } = await adminClient.auth.admin.deleteUser(params.id)

  if (error) {
    console.error('[DELETE /api/users/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Crear `app/api/users/[id]/permissions/route.ts`** (PATCH)

```typescript
// app/api/users/[id]/permissions/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'
import type { UserPermissions } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const body = await request.json()
  const { permissions } = body as { permissions: UserPermissions }

  if (!permissions || typeof permissions !== 'object') {
    return NextResponse.json({ error: 'permissions es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: user, error } = await adminClient
    .from('users')
    .update({ permissions })
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/users/:id/permissions]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user })
}
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add app/api/users/
git commit -m "feat: users API routes (list, create, delete, update permissions)"
```

---

## Task 4: Admin Users page

**Files:**
- Create: `components/admin/users/users-client.tsx`
- Modify: `app/(dashboard)/admin/users/page.tsx`

- [ ] **Step 1: Crear `components/admin/users/users-client.tsx`**

```tsx
// components/admin/users/users-client.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User, Client, UserPermissions } from '@/lib/types'

interface UsersClientProps {
  initialUsers: User[]
  clients: Client[]
  currentUserId: string
}

export function UsersClient({ initialUsers, clients, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [createOpen, setCreateOpen] = useState(false)
  const [permOpen, setPermOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Create form
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'custom'>('custom')

  // Permissions form
  const [perms, setPerms] = useState<UserPermissions>({
    can_schedule: false,
    can_publish: false,
    can_view_analytics: false,
    can_manage_accounts: false,
    clients: [],
  })

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => [...prev, data.user as User])
      setCreateOpen(false)
      setEmail(''); setFullName(''); setPassword(''); setRole('custom')
      toast.success('Usuario creado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  function openPerms(user: User) {
    setSelectedUser(user)
    const p = user.permissions
    setPerms({
      can_schedule: p?.can_schedule ?? false,
      can_publish: p?.can_publish ?? false,
      can_view_analytics: p?.can_view_analytics ?? false,
      can_manage_accounts: p?.can_manage_accounts ?? false,
      clients: p?.clients ?? [],
    })
    setPermOpen(true)
  }

  async function handleSavePerms() {
    if (!selectedUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => (u.id === selectedUser.id ? (data.user as User) : u)))
      setPermOpen(false)
      toast.success('Permisos actualizados')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar permisos')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('Usuario eliminado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar usuario')
    }
  }

  function toggleClient(clientId: string) {
    setPerms(prev => ({
      ...prev,
      clients: prev.clients?.includes(clientId)
        ? prev.clients.filter(c => c !== clientId)
        : [...(prev.clients ?? []), clientId],
    }))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuarios</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestiona los miembros de tu agencia</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name ?? '—'}</TableCell>
                <TableCell className="text-zinc-500">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {new Date(user.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.role === 'custom' && (
                      <Button variant="outline" size="sm" onClick={() => openPerms(user)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                    {user.id !== currentUserId && (
                      <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-zinc-400">
                  No hay usuarios aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Crear usuario */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan García"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@agencia.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña temporal</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={v => setRole(v as 'admin' | 'custom')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !email.trim() || !fullName.trim() || !password}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar permisos */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos — {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">Capacidades</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_schedule"
                  checked={perms.can_schedule ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_schedule: !!v }))}
                />
                <Label htmlFor="can_schedule" className="font-normal">Programar posts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_publish"
                  checked={perms.can_publish ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_publish: !!v }))}
                />
                <Label htmlFor="can_publish" className="font-normal">Publicar inmediatamente</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_view_analytics"
                  checked={perms.can_view_analytics ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_view_analytics: !!v }))}
                />
                <Label htmlFor="can_view_analytics" className="font-normal">Ver analytics</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_manage_accounts"
                  checked={perms.can_manage_accounts ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_manage_accounts: !!v }))}
                />
                <Label htmlFor="can_manage_accounts" className="font-normal">Gestionar cuentas</Label>
              </div>
            </div>
            {clients.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700">Clientes asignados</p>
                {clients.map(client => (
                  <div key={client.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={perms.clients?.includes(client.id) ?? false}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <Label htmlFor={`client-${client.id}`} className="font-normal">
                      {client.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPermOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePerms} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Permisos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar `app/(dashboard)/admin/users/page.tsx`**

```tsx
// app/(dashboard)/admin/users/page.tsx
import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { UsersClient } from '@/components/admin/users/users-client'
import type { User, Client } from '@/lib/types'

export default async function AdminUsersPage() {
  const adminUser = await requireAdmin()
  const supabase = createClient()

  const [{ data: usersRaw }, { data: clientsRaw }] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: true }),
    supabase.from('clients').select('*').order('name', { ascending: true }),
  ])

  return (
    <UsersClient
      initialUsers={(usersRaw ?? []) as User[]}
      clients={(clientsRaw ?? []) as Client[]}
      currentUserId={adminUser.id}
    />
  )
}
```

- [ ] **Step 3: Build para verificar**

```bash
npm run build 2>&1 | tail -25
```

Expected: build exitoso, 0 errores TypeScript.

- [ ] **Step 4: Commit**

```bash
git add components/admin/users/ app/\(dashboard\)/admin/users/page.tsx
git commit -m "feat: admin users page with create, permissions and delete"
```

---

## Task 5: Clients API routes

**Files:**
- Create: `app/api/clients/route.ts`
- Create: `app/api/clients/[id]/route.ts`

- [ ] **Step 1: Crear `app/api/clients/route.ts`** (GET + POST)

```typescript
// app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('[GET /api/clients]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: client, error } = await adminClient
    .from('clients')
    .insert({
      company_id: guard.user.company_id,
      name: name.trim(),
      logo_url: logo_url?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/clients]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client }, { status: 201 })
}
```

- [ ] **Step 2: Crear `app/api/clients/[id]/route.ts`** (PATCH + DELETE)

```typescript
// app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { name, logo_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: client, error } = await adminClient
    .from('clients')
    .update({ name: name.trim(), logo_url: logo_url?.trim() || null })
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ client })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('clients')
    .delete()
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)

  if (error) {
    console.error('[DELETE /api/clients/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add app/api/clients/
git commit -m "feat: clients API routes (list, create, update, delete)"
```

---

## Task 6: Admin Clients page

**Files:**
- Create: `components/admin/clients/clients-client.tsx`
- Modify: `app/(dashboard)/admin/clients/page.tsx`

- [ ] **Step 1: Crear `components/admin/clients/clients-client.tsx`**

```tsx
// components/admin/clients/clients-client.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Client } from '@/lib/types'

interface ClientsClientProps {
  initialClients: Client[]
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const [clients, setClients] = useState(initialClients)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  function openCreate() {
    setEditing(null)
    setName('')
    setLogoUrl('')
    setDialogOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setName(client.name)
    setLogoUrl(client.logo_url ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    try {
      if (editing) {
        const res = await fetch(`/api/clients/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, logo_url: logoUrl || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClients(prev => prev.map(c => (c.id === editing.id ? (data.client as Client) : c)))
        toast.success('Cliente actualizado')
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, logo_url: logoUrl || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClients(prev => [...prev, data.client as Client])
        toast.success('Cliente creado')
      }
      setDialogOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(clientId: string) {
    if (!confirm('¿Eliminar este cliente? Se eliminarán también sus cuentas sociales y posts.')) return
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClients(prev => prev.filter(c => c.id !== clientId))
      toast.success('Cliente eliminado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestiona los clientes de tu agencia</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Logo URL</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-zinc-400">
                  {client.logo_url ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {new Date(client.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-zinc-400">
                  No hay clientes aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="client-name">Nombre *</Label>
              <Input
                id="client-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logo-url">Logo URL (opcional)</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar `app/(dashboard)/admin/clients/page.tsx`**

```tsx
// app/(dashboard)/admin/clients/page.tsx
import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/admin/clients/clients-client'
import type { Client } from '@/lib/types'

export default async function AdminClientsPage() {
  await requireAdmin()
  const supabase = createClient()

  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  return <ClientsClient initialClients={(clientsRaw ?? []) as Client[]} />
}
```

- [ ] **Step 3: Build para verificar**

```bash
npm run build 2>&1 | tail -25
```

Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add components/admin/clients/ app/\(dashboard\)/admin/clients/page.tsx
git commit -m "feat: admin clients page with create, edit and delete"
```

---

## Task 7: Accounts API routes

**Files:**
- Create: `app/api/accounts/route.ts`
- Create: `app/api/accounts/[id]/route.ts`

**Regla de seguridad:** `credentials_enc` y `access_token_enc` NUNCA se devuelven en respuestas. El SELECT siempre omite esos campos.

- [ ] **Step 1: Crear `app/api/accounts/route.ts`** (GET + POST)

```typescript
// app/api/accounts/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'
import { encrypt } from '@/lib/crypto'

const SAFE_SELECT = 'id, client_id, platform, username, is_active, added_by_id, created_at, client:clients(id, name)'

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const supabase = createClient()
  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select(SAFE_SELECT)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/accounts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ accounts })
}

export async function POST(request: Request) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const { client_id, platform, username, access_token } = await request.json()

  if (!client_id || !platform || !username?.trim()) {
    return NextResponse.json(
      { error: 'client_id, platform y username son requeridos' },
      { status: 400 }
    )
  }

  if (!['instagram', 'facebook', 'tiktok'].includes(platform)) {
    return NextResponse.json(
      { error: 'platform debe ser instagram, facebook o tiktok' },
      { status: 400 }
    )
  }

  const access_token_enc = access_token?.trim() ? encrypt(access_token.trim()) : null

  const adminClient = createAdminClient()
  const { data: account, error } = await adminClient
    .from('social_accounts')
    .insert({
      client_id,
      platform,
      username: username.trim(),
      access_token_enc,
      is_active: true,
      added_by_id: guard.user.id,
    })
    .select(SAFE_SELECT)
    .single()

  if (error) {
    console.error('[POST /api/accounts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account }, { status: 201 })
}
```

- [ ] **Step 2: Crear `app/api/accounts/[id]/route.ts`** (DELETE)

```typescript
// app/api/accounts/[id]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/api-guard'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const adminClient = createAdminClient()

  // Verificar que la cuenta pertenece a un cliente de la empresa del admin
  const { data: account } = await adminClient
    .from('social_accounts')
    .select('id, client:clients(company_id)')
    .eq('id', params.id)
    .single()

  const clientCompanyId = (account?.client as { company_id: string } | null)?.company_id

  if (!account || clientCompanyId !== guard.user.company_id) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('social_accounts')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('[DELETE /api/accounts/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add app/api/accounts/
git commit -m "feat: accounts API routes with credential encryption (list, create, delete)"
```

---

## Task 8: Admin Accounts page

**Files:**
- Create: `components/admin/accounts/accounts-client.tsx`
- Modify: `app/(dashboard)/admin/accounts/page.tsx`

- [ ] **Step 1: Crear `components/admin/accounts/accounts-client.tsx`**

```tsx
// components/admin/accounts/accounts-client.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Client } from '@/lib/types'

export interface AccountRow {
  id: string
  platform: string
  username: string
  is_active: boolean
  created_at: string
  client: { id: string; name: string } | null
}

interface AccountsClientProps {
  initialAccounts: AccountRow[]
  clients: Client[]
}

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent',
  facebook: 'bg-blue-600 text-white border-transparent',
  tiktok: 'bg-zinc-900 text-white border-transparent',
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

export function AccountsClient({ initialAccounts, clients }: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [platform, setPlatform] = useState('')
  const [username, setUsername] = useState('')
  const [accessToken, setAccessToken] = useState('')

  function openAdd() {
    setClientId(''); setPlatform(''); setUsername(''); setAccessToken('')
    setDialogOpen(true)
  }

  async function handleAdd() {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          platform,
          username,
          access_token: accessToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const clientInfo = clients.find(c => c.id === clientId) ?? null
      const newAccount: AccountRow = {
        ...data.account,
        client: clientInfo ? { id: clientInfo.id, name: clientInfo.name } : null,
      }
      setAccounts(prev => [...prev, newAccount])
      setDialogOpen(false)
      toast.success('Cuenta agregada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar cuenta')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('¿Eliminar esta cuenta social? Se eliminarán también sus posts programados.')) return
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      toast.success('Cuenta eliminada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cuentas Sociales</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestiona las cuentas de redes sociales de tus clientes
          </p>
        </div>
        <Button onClick={openAdd} disabled={clients.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Cuenta
        </Button>
      </div>

      {clients.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Debes crear al menos un cliente antes de agregar cuentas sociales.
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plataforma</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Agregada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => (
              <TableRow key={account.id}>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_BADGE[account.platform] ?? 'bg-zinc-100 text-zinc-800 border-zinc-200'}`}
                  >
                    {PLATFORM_LABEL[account.platform] ?? account.platform}
                  </span>
                </TableCell>
                <TableCell className="font-medium">@{account.username}</TableCell>
                <TableCell className="text-zinc-500">{account.client?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={account.is_active ? 'default' : 'secondary'}>
                    {account.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {new Date(account.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-zinc-400">
                  No hay cuentas sociales aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Cuenta Social</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Plataforma *</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-username">Username *</Label>
              <Input
                id="acc-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="nombre_usuario (sin @)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="access-token">Access Token (opcional)</Label>
              <Input
                id="access-token"
                type="password"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="Token de la API de la plataforma"
              />
              <p className="text-xs text-zinc-400">
                El token se cifra con AES-256-GCM y nunca se muestra en la UI.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading || !clientId || !platform || !username.trim()}
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar `app/(dashboard)/admin/accounts/page.tsx`**

```tsx
// app/(dashboard)/admin/accounts/page.tsx
import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/admin/accounts/accounts-client'
import type { Client } from '@/lib/types'
import type { AccountRow } from '@/components/admin/accounts/accounts-client'

export default async function AdminAccountsPage() {
  await requireAdmin()
  const supabase = createClient()

  const [{ data: accountsRaw }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('id, platform, username, is_active, created_at, client:clients(id, name)')
      .order('created_at', { ascending: true }),
    supabase.from('clients').select('*').order('name', { ascending: true }),
  ])

  return (
    <AccountsClient
      initialAccounts={(accountsRaw ?? []) as unknown as AccountRow[]}
      clients={(clientsRaw ?? []) as Client[]}
    />
  )
}
```

- [ ] **Step 3: Build final del Plan 2**

```bash
npm run build 2>&1 | tail -30
```

Expected: build exitoso. 0 errores TypeScript. Las rutas `/admin/users`, `/admin/clients`, `/admin/accounts` aparecen listadas.

- [ ] **Step 4: Commit final del Plan 2**

```bash
git add components/admin/accounts/ app/\(dashboard\)/admin/accounts/page.tsx
git commit -m "feat: admin accounts page with encrypted credential storage"
```

- [ ] **Step 5: Push al remote**

```bash
git push
```

---

## Self-Review

### Cobertura del spec

| Requisito del spec | Task que lo implementa |
|---|---|
| `GET /api/users` — listar usuarios | Task 3 |
| `POST /api/users` — crear + invitar | Task 3 |
| `PATCH /api/users/:id/permissions` | Task 3 |
| `DELETE /api/users/:id` | Task 3 |
| Página `/admin/users` con CRUD completo | Task 4 |
| Permisos granulares (can_schedule, can_publish, etc.) | Task 4 |
| Clientes asignados por usuario | Task 4 |
| `GET /api/clients`, `POST /api/clients` | Task 5 |
| `PATCH /api/clients/:id`, `DELETE /api/clients/:id` | Task 5 |
| Página `/admin/clients` con CRUD completo | Task 6 |
| `GET /api/accounts` (sin credenciales) | Task 7 |
| `POST /api/accounts` (cifra access_token) | Task 7 |
| `DELETE /api/accounts/:id` | Task 7 |
| Página `/admin/accounts` con tabla + agregar/borrar | Task 8 |
| Admin guard: redirect si no admin | Task 2 |
| Credenciales NUNCA en respuesta de API | Task 7 (SAFE_SELECT) |
| AES-256-GCM en POST /api/accounts | Task 7 |
| Toasts de confirmación/error | Task 1 (Sonner) + Tasks 4/6/8 |
| Nuevo usuario no puede crearse sin empresa | Task 3 (usa company_id del guard) |
| Admin no puede eliminarse a sí mismo | Task 3 |
