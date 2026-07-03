# OmniMark — Plan 3: Content Pages Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las páginas de contenido principal de OmniMark: API de posts programados, cron de publicación, composer, calendario, analytics, feed por cuenta y configuración de perfil.

**Architecture:** Mismo patrón que Plan 2 — Server Component fetcha datos + Client Component maneja interactividad. Las API routes para posts usan `requireAuthApi()` (usuarios autenticados, con filtrado por permisos). El cron endpoint usa `CRON_SECRET` para autenticarse. No hay integración real con APIs sociales en esta fase: el cron marca posts como `published` directamente.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase SSR, Sonner toasts, lucide-react.

---

## Mapa de Archivos

```
app/
├── api/
│   ├── posts/
│   │   ├── route.ts                     # GET (list con perm filter), POST (create)
│   │   └── [id]/
│   │       └── route.ts                 # PATCH (edit), DELETE (cancel)
│   ├── cron/
│   │   └── publish/
│   │       └── route.ts                 # POST (ejecutado por Vercel Cron)
│   └── auth/
│       └── logout/
│           └── route.ts                 # POST (logout)
└── (dashboard)/
    ├── compose/page.tsx                  # Updated — fetcha accounts, renderiza ComposeClient
    ├── calendar/page.tsx                 # Updated — fetcha posts, renderiza CalendarClient
    ├── analytics/page.tsx                # Updated — fetcha metrics, renderiza AnalyticsClient
    ├── feed/[accountId]/page.tsx         # Updated — fetcha posts del account, renderiza FeedClient
    └── settings/page.tsx                 # Updated — fetcha perfil, renderiza SettingsClient

components/
├── compose/
│   └── compose-client.tsx               # Form: select account, type, caption, media_url, scheduled_at
├── calendar/
│   └── calendar-client.tsx              # Lista de posts agrupados por fecha
├── analytics/
│   └── analytics-client.tsx             # Métricas agregadas de post_metrics
├── feed/
│   └── feed-client.tsx                  # Posts publicados de una cuenta social
└── settings/
    └── settings-client.tsx              # Formulario: editar full_name, cambiar password, logout

lib/
└── api-guard.ts                          # Agregar requireAuthApi() para usuarios autenticados (no solo admins)
```

---

## Context crítico para todos los tasks

### Patrón de API existente
```typescript
// API guard pattern (admin)
const guard = await requireAdminApi()
if (guard.error) return guard.error
// guard.user es User con company_id, role, permissions

// Supabase client (user session — respeta RLS)
const supabase = createClient()
// Admin client (service role — bypasa RLS)
const adminClient = createAdminClient()
```

### Tipos relevantes (lib/types.ts)
```typescript
type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
type ContentType = 'post' | 'reel' | 'story' | 'video'

type ScheduledPost = {
  id: string; social_account_id: string; content_type: ContentType
  caption: string | null; media_url: string | null
  scheduled_at: string; status: PostStatus
  error_msg: string | null; created_by_id: string | null; created_at: string
}

type PostMetrics = {
  id: string; scheduled_post_id: string
  likes: number; comments: number; shares: number
  reach: number; engagement_rate: number; fetched_at: string
}

type SocialAccountWithClient = SocialAccount & {
  client: Pick<Client, 'id' | 'name'> | null
}

type UserPermissions = {
  clients?: string[]; can_publish?: boolean; can_schedule?: boolean
  can_view_analytics?: boolean; can_manage_accounts?: boolean
}
```

### Permisos (lib/permissions.ts)
```typescript
canSchedule(user): boolean   // admin || can_schedule
canPublish(user): boolean    // admin || can_publish
canViewAnalytics(user): boolean  // admin || can_view_analytics
canViewClient(user, clientId): boolean  // admin || clients.includes(clientId)
```

### Ejemplo de Server Component page existente
```typescript
// app/(dashboard)/admin/clients/page.tsx
import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/admin/clients/clients-client'

export default async function ClientsPage() {
  await requireAdmin()
  const supabase = createClient()
  const { data: clients } = await supabase.from('clients').select('*').order('name')
  return <ClientsClient clients={clients ?? []} />
}
```

### .env.local keys
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ENCRYPTION_KEY=...
CRON_SECRET=e6e14b57401450a19a90bd64958fa4ff
```

### Ruta base del proyecto
```
C:\Users\Usuario\Documents\Trabajos Externos\Proyectos personales\Pascuas
```

---

## Task 1: Posts API + requireAuthApi guard

**Files:**
- Modify: `lib/api-guard.ts` (agregar `requireAuthApi`)
- Create: `app/api/posts/route.ts`
- Create: `app/api/posts/[id]/route.ts`

### Step 1: Agregar `requireAuthApi` a api-guard.ts

Agregar después de `requireAdminApi`. Esta función autentica cualquier usuario (no solo admins):

```typescript
export async function requireAuthApi(): Promise<ApiGuardResult> {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profileRaw } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const profile = profileRaw as User | null
  if (!profile) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user: profile, error: null }
}
```

### Step 2: Crear `app/api/posts/route.ts`

```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule, canViewClient } from '@/lib/permissions'
import type { ScheduledPost, SocialAccount } from '@/lib/types'

// GET /api/posts — lista posts accesibles al usuario
// Filtros opcionales: ?account_id=uuid&status=scheduled
export async function GET(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status')

  const supabase = createClient()

  // Traer posts con info de la cuenta + cliente
  let query = supabase
    .from('scheduled_posts')
    .select('*, social_account:social_accounts(id, platform, username, client_id, client:clients(id, name, company_id))')
    .order('scheduled_at', { ascending: false })

  if (accountId) query = query.eq('social_account_id', accountId)
  if (status) query = query.eq('status', status)

  const { data: postsRaw, error } = await query

  if (error) {
    console.error('[GET /api/posts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filtrar por permisos del usuario
  const posts = (postsRaw ?? []).filter((p: any) => {
    const clientId = p.social_account?.client?.id
    if (!clientId) return false
    // Verificar que el cliente pertenece a la empresa del usuario (RLS ya lo garantiza en companies)
    return canViewClient(guard.user, clientId)
  })

  return NextResponse.json({ posts })
}

// POST /api/posts — crear post programado
export async function POST(request: Request) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para programar posts' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { social_account_id, content_type, caption, media_url, scheduled_at, status = 'scheduled' } = body

  if (!social_account_id || !content_type || !scheduled_at) {
    return NextResponse.json(
      { error: 'social_account_id, content_type y scheduled_at son requeridos' },
      { status: 400 }
    )
  }

  const validTypes = ['post', 'reel', 'story', 'video']
  if (!validTypes.includes(content_type)) {
    return NextResponse.json({ error: 'content_type inválido' }, { status: 400 })
  }

  const validStatuses = ['draft', 'scheduled']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const supabase = createClient()

  // Verificar que la cuenta existe y el usuario puede acceder a su cliente
  const { data: accountRaw, error: accountError } = await supabase
    .from('social_accounts')
    .select('id, client_id, client:clients(id, name)')
    .eq('id', social_account_id)
    .single()

  if (accountError || !accountRaw) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  const account = accountRaw as any
  if (!canViewClient(guard.user, account.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a esta cuenta' }, { status: 403 })
  }

  const { data: post, error: insertError } = await supabase
    .from('scheduled_posts')
    .insert({
      social_account_id,
      content_type,
      caption: caption?.trim() || null,
      media_url: media_url?.trim() || null,
      scheduled_at,
      status,
      created_by_id: guard.user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[POST /api/posts]', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ post }, { status: 201 })
}
```

### Step 3: Crear `app/api/posts/[id]/route.ts`

```typescript
// app/api/posts/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthApi } from '@/lib/api-guard'
import { canSchedule, canViewClient } from '@/lib/permissions'

// PATCH /api/posts/[id] — editar post (solo si status = 'draft' | 'scheduled')
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para editar posts' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const supabase = createClient()

  // Verificar que el post existe y el usuario tiene acceso
  const { data: postRaw, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('*, social_account:social_accounts(client_id)')
    .eq('id', params.id)
    .single()

  if (fetchError || !postRaw) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  const post = postRaw as any
  if (!canViewClient(guard.user, post.social_account?.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (!['draft', 'scheduled'].includes(post.status)) {
    return NextResponse.json({ error: 'Solo se pueden editar posts en draft o scheduled' }, { status: 400 })
  }

  const { caption, media_url, scheduled_at, status, content_type } = body

  const update: Record<string, unknown> = {}
  if (caption !== undefined) update.caption = caption?.trim() || null
  if (media_url !== undefined) update.media_url = media_url?.trim() || null
  if (scheduled_at !== undefined) update.scheduled_at = scheduled_at
  if (content_type !== undefined) update.content_type = content_type
  if (status !== undefined && ['draft', 'scheduled'].includes(status)) update.status = status

  const { data: updated, error: updateError } = await supabase
    .from('scheduled_posts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('[PATCH /api/posts/[id]]', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ post: updated })
}

// DELETE /api/posts/[id] — cancelar/eliminar post
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthApi()
  if (guard.error) return guard.error

  if (!canSchedule(guard.user)) {
    return NextResponse.json({ error: 'Sin permiso para cancelar posts' }, { status: 403 })
  }

  const supabase = createClient()

  const { data: postRaw, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('*, social_account:social_accounts(client_id)')
    .eq('id', params.id)
    .single()

  if (fetchError || !postRaw) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  const post = postRaw as any
  if (!canViewClient(guard.user, post.social_account?.client_id)) {
    return NextResponse.json({ error: 'Sin acceso a este post' }, { status: 403 })
  }

  if (post.status === 'publishing') {
    return NextResponse.json({ error: 'No se puede eliminar un post en proceso de publicación' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    console.error('[DELETE /api/posts/[id]]', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 1: Modificar `lib/api-guard.ts`** — agregar `requireAuthApi` exportado
- [ ] **Step 2: Crear `app/api/posts/route.ts`**
- [ ] **Step 3: Crear `app/api/posts/[id]/route.ts`**
- [ ] **Step 4: Verificar tipos** — `npx tsc --noEmit` (0 errores)
- [ ] **Step 5: Commit** — `git add lib/api-guard.ts app/api/posts/ && git commit -m "feat: posts API with permission-based filtering"`

---

## Task 2: Cron Publish Endpoint

**Files:**
- Create: `app/api/cron/publish/route.ts`
- Create: `app/api/auth/logout/route.ts`

### Endpoint: `POST /api/cron/publish`

Autenticación: header `Authorization: Bearer ${CRON_SECRET}`.

Lógica:
1. Buscar posts con `status = 'scheduled'` y `scheduled_at <= now()`
2. Para cada uno: actualizar status a `publishing`
3. Simular publicación (fase 1 no tiene API real): actualizar a `published`
4. Si falla: actualizar a `failed` con `error_msg`

```typescript
// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // Verificar autenticación del cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // Buscar posts listos para publicar
  const { data: posts, error: fetchError } = await adminClient
    .from('scheduled_posts')
    .select('id, social_account_id, content_type, caption, media_url')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (fetchError) {
    console.error('[CRON /api/cron/publish] fetch:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ published: 0, failed: 0 })
  }

  let published = 0
  let failed = 0

  for (const post of posts) {
    // Marcar como publishing
    await adminClient
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    try {
      // Fase 1: simulación de publicación (sin API real)
      // En fase 2: llamar a Instagram/Facebook/TikTok API aquí

      await adminClient
        .from('scheduled_posts')
        .update({ status: 'published', error_msg: null })
        .eq('id', post.id)

      published++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`[CRON] Post ${post.id} falló:`, msg)

      await adminClient
        .from('scheduled_posts')
        .update({ status: 'failed', error_msg: msg })
        .eq('id', post.id)

      failed++
    }
  }

  console.log(`[CRON] published=${published} failed=${failed}`)
  return NextResponse.json({ published, failed })
}
```

### Endpoint: `POST /api/auth/logout`

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 1: Crear `app/api/cron/publish/route.ts`**
- [ ] **Step 2: Crear `app/api/auth/logout/route.ts`**
- [ ] **Step 3: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 4: Commit** — `git add app/api/cron app/api/auth/logout && git commit -m "feat: cron publish endpoint + logout API"`

---

## Task 3: Compose Page (crear/programar posts)

**Files:**
- Create: `components/compose/compose-client.tsx`
- Modify: `app/(dashboard)/compose/page.tsx`

### Server Component (`app/(dashboard)/compose/page.tsx`)

```typescript
// app/(dashboard)/compose/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-guard'  // No — usar auth check normal
import { ComposeClient } from '@/components/compose/compose-client'
import type { SocialAccountWithClient, User } from '@/lib/types'
import { canSchedule } from '@/lib/permissions'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

export default async function ComposePage() {
  const supabase = createSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  const profile = profileRaw as User | null
  if (!profile) redirect('/login')

  // Solo usuarios con permiso de programar pueden acceder
  if (!canSchedule(profile)) {
    redirect('/')
  }

  // Traer cuentas accesibles (RLS filtra por company)
  const { data: rawAccounts } = await supabase
    .from('social_accounts')
    .select('*, client:clients(id, name)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const accounts = (rawAccounts ?? []) as SocialAccountWithClient[]

  // Si usuario no es admin, filtrar por clientes asignados
  const filteredAccounts = profile.role === 'admin'
    ? accounts
    : accounts.filter(a => profile.permissions?.clients?.includes(a.client_id))

  return <ComposeClient accounts={filteredAccounts} userId={profile.id} />
}
```

### Client Component (`components/compose/compose-client.tsx`)

El formulario tiene:
- **Account selector** — `<Select>` con cuentas disponibles (label: "ClientName · @username · Platform")
- **Content type** — `<Select>` con opciones: post, reel, story, video
- **Caption** — `<Textarea>` (200 chars contador, opcional)
- **Media URL** — `<Input>` type=url (opcional, placeholder "https://...")
- **Scheduled At** — `<Input>` type="datetime-local"
- **Status** — radio/toggle: "Programar" (scheduled) | "Guardar borrador" (draft)
- **Submit button** — "Programar post" / "Guardar borrador"

Estados:
- `loading: boolean`
- `success: boolean` — muestra mensaje de éxito + botón "Crear otro"
- `error: string | null`

Al submit: `POST /api/posts` con el body. On 201: `toast.success('Post programado')` + reset form o mostrar success state.

Imports necesarios:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
```

Estilos: misma línea visual que admin panel (zinc-900 accents, clean cards).

- [ ] **Step 1: Crear `components/compose/compose-client.tsx`**
- [ ] **Step 2: Actualizar `app/(dashboard)/compose/page.tsx`**
- [ ] **Step 3: Agregar `<Textarea>` de shadcn si no existe** — crear `components/ui/textarea.tsx`
- [ ] **Step 4: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 5: Commit** — `git add components/compose app/(dashboard)/compose && git commit -m "feat: compose page — create and schedule posts"`

---

## Task 4: Calendar Page (posts por fecha)

**Files:**
- Create: `components/calendar/calendar-client.tsx`
- Modify: `app/(dashboard)/calendar/page.tsx`

### Server Component (`app/(dashboard)/calendar/page.tsx`)

Fetcha todos los posts accesibles al usuario (status: scheduled, draft, published, failed), con info de la cuenta social. Pasa al Client Component.

```typescript
export default async function CalendarPage() {
  // auth check igual que compose page (no solo admins)
  // fetch posts con select('*, social_account:social_accounts(id, platform, username, client_id, client:clients(id, name))')
  // filtrar por canViewClient si no es admin
  // pasar posts + profile al CalendarClient
}
```

### Client Component (`components/calendar/calendar-client.tsx`)

Vista de lista agrupada por fecha (no un calendario real por complejidad, sino lista cronológica con cabeceras de fecha).

Características:
- Filtros por status (tabs o select): Todos | Programados | Borradores | Publicados | Fallidos
- Cada post muestra: plataforma (badge con color), cliente, @username, tipo de contenido, caption (truncado 80 chars), fecha/hora
- Badge de status con colores: scheduled=blue, draft=zinc, published=green, failed=red, publishing=amber
- Botón "Nuevo Post" en el header → link a `/compose`
- Botón "Eliminar" en cada post (si status es draft/scheduled) — llama `DELETE /api/posts/[id]` y actualiza lista local
- Empty state: "No hay posts aún. ¡Creá tu primer post!" con link a /compose

- [ ] **Step 1: Crear `components/calendar/calendar-client.tsx`**
- [ ] **Step 2: Actualizar `app/(dashboard)/calendar/page.tsx`**
- [ ] **Step 3: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 4: Commit** — `git add components/calendar app/(dashboard)/calendar && git commit -m "feat: calendar page — scheduled posts list view"`

---

## Task 5: Analytics Page (métricas)

**Files:**
- Create: `components/analytics/analytics-client.tsx`
- Modify: `app/(dashboard)/analytics/page.tsx`

### Server Component (`app/(dashboard)/analytics/page.tsx`)

Fetcha:
1. Cuentas accesibles al usuario
2. Posts publicados con sus métricas (`post_metrics`)
3. Agrega totales: suma de likes, comments, shares, reach por cuenta

```typescript
// select posts publicados con métricas
const { data } = await supabase
  .from('scheduled_posts')
  .select('*, social_account:social_accounts(id, platform, username, client:clients(id, name)), post_metrics(*)')
  .eq('status', 'published')
  .order('scheduled_at', { ascending: false })
```

### Client Component (`components/analytics/analytics-client.tsx`)

Si el usuario no tiene `can_view_analytics` y no es admin: mostrar "Sin acceso" (aunque el server redirect ya lo maneja).

Layout:
- **Header:** "Analytics" + selector de cuenta (Select) para filtrar
- **Cards de resumen** (4 metrics cards): Total Posts, Total Likes, Total Alcance, Engagement Promedio
- **Tabla de posts:** columnas — Fecha, Cuenta, Tipo, Caption (truncated), Likes, Comments, Shares, Reach, Engagement%
- **Empty state:** "Sin datos de métricas aún. Los posts publicados mostrarán sus métricas aquí."

Los cálculos se hacen en el cliente a partir de los datos pasados desde el server component.

- [ ] **Step 1: Crear `components/analytics/analytics-client.tsx`**
- [ ] **Step 2: Actualizar `app/(dashboard)/analytics/page.tsx`**
- [ ] **Step 3: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 4: Commit** — `git add components/analytics app/(dashboard)/analytics && git commit -m "feat: analytics page — metrics dashboard"`

---

## Task 6: Feed Page (posts publicados por cuenta)

**Files:**
- Create: `components/feed/feed-client.tsx`
- Modify: `app/(dashboard)/feed/[accountId]/page.tsx`

### Server Component (`app/(dashboard)/feed/[accountId]/page.tsx`)

```typescript
export default async function FeedPage({ params }: { params: { accountId: string } }) {
  // auth check
  // verificar que la cuenta existe y el usuario tiene acceso a su cliente
  // fetch posts publicados de esa cuenta
  //   .from('scheduled_posts').select('*, post_metrics(*)').eq('social_account_id', params.accountId).eq('status', 'published').order('scheduled_at', {ascending: false})
  // pasar al FeedClient
}
```

### Client Component (`components/feed/feed-client.tsx`)

Muestra el "feed nativo" de la cuenta (publicaciones desde nuestra BD):
- **Header:** badge de plataforma (IG/FB/TK), @username, nombre del cliente, "Cuenta activa" badge
- **Grid de posts** (2 columnas en desktop): cada card muestra:
  - Placeholder de imagen (si hay media_url: mostrar como link, sino: div gris con ícono)
  - Tipo de contenido (badge)
  - Caption (truncado 120 chars)
  - Fecha de publicación
  - Métricas si están disponibles (likes, comments, reach)
- **Empty state:** "Esta cuenta no tiene publicaciones aún."

- [ ] **Step 1: Crear `components/feed/feed-client.tsx`**
- [ ] **Step 2: Actualizar `app/(dashboard)/feed/[accountId]/page.tsx`**
- [ ] **Step 3: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 4: Commit** — `git add components/feed app/(dashboard)/feed && git commit -m "feat: feed page — published posts per account"`

---

## Task 7: Settings Page (perfil + logout)

**Files:**
- Create: `components/settings/settings-client.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

### Server Component (`app/(dashboard)/settings/page.tsx`)

```typescript
export default async function SettingsPage() {
  // auth check estándar (sin requireAdmin)
  // fetch perfil completo del usuario
  return <SettingsClient user={profile} />
}
```

### Client Component (`components/settings/settings-client.tsx`)

Dos secciones en cards:

**Sección 1: Perfil**
- Campo: Nombre completo (Input, value = user.full_name)
- Campo: Email (Input, disabled, value = user.email — no editable)
- Botón "Guardar cambios" → `PATCH /api/users/[id]` con `{ full_name }`...

  **NOTA:** En lugar de un API route dedicado, usar el Supabase client directamente para actualizar el propio perfil:
  ```typescript
  const supabase = createClient()
  await supabase.from('users').update({ full_name }).eq('id', user.id)
  ```
  Esto funciona porque RLS permite a usuarios editar su propio registro (o usar el API de users existente).

**Sección 2: Seguridad**
- Botón "Cambiar contraseña" → `await supabase.auth.updateUser({ password: newPassword })`
- Campos: nueva contraseña + confirmar contraseña
- Validación: mínimo 8 chars, 1 mayúscula, 1 número (igual que registro)
- Toast en éxito/error

**Sección 3: Sesión**
- Botón "Cerrar sesión" (destructive/red) → POST /api/auth/logout → router.push('/login')

Imports: `createClient` from `@/lib/supabase/client`

- [ ] **Step 1: Crear `components/settings/settings-client.tsx`**
- [ ] **Step 2: Actualizar `app/(dashboard)/settings/page.tsx`**
- [ ] **Step 3: Verificar tipos** — `npx tsc --noEmit`
- [ ] **Step 4: Build final** — `npm run build 2>&1 | tail -30`
- [ ] **Step 5: Commit + Push** — `git add components/settings app/(dashboard)/settings && git commit -m "feat: settings page — profile update and logout" && git push`
