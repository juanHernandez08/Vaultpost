# Pascuas — Social Media Manager Webapp · Diseño v1

**Fecha:** 2026-04-03
**Estado:** Aprobado

---

## 1. Problema

Un Community Manager que gestiona 20+ cuentas de Instagram, TikTok y Facebook se ve obligado a usar múltiples dispositivos porque las apps nativas limitan el número de perfiles por dispositivo. No existe una plataforma accesible que centralice todas las cuentas, permita programar contenido y entregue analytics sin límites artificiales de cuentas ni costos prohibitivos.

---

## 2. Solución

**Pascuas** es una webapp SaaS de gestión de redes sociales para agencias y Community Managers. Permite centralizar todas las cuentas de clientes, programar posts/reels/stories en Instagram, Facebook y TikTok, y ver analytics — todo desde una interfaz única, profesional y sin límite de cuentas.

**Fase 1 (actual):** herramienta interna para una sola agencia.
**Fase futura:** SaaS multi-tenant vendible a otras agencias.

---

## 3. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Auth + Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel (gratis al inicio) |
| Cifrado de credenciales | AES-256-GCM (Node.js crypto nativo) |
| Publicación programada | Vercel Cron Jobs |
| Mobile (futuro) | React Native (reutiliza lógica de negocio) |

---

## 4. Arquitectura

```
Navegador
  └─ Next.js App (Vercel)
        ├─ /app          → páginas React (App Router)
        ├─ /app/api      → API routes (lógica de negocio, credenciales, APIs sociales)
        └─ /lib          → helpers, Supabase client, cifrado
              │
              ├─── Supabase
              │     ├─ Auth (sesiones persistentes)
              │     ├─ PostgreSQL (datos)
              │     └─ Storage (media de posts)
              │
              └─── APIs Externas
                    ├─ Instagram Graph API
                    ├─ Facebook Graph API
                    └─ TikTok Content Posting API
```

**Principio clave:** las credenciales y tokens de cuentas sociales NUNCA llegan al navegador. Toda llamada a APIs externas ocurre en API routes del servidor.

---

## 5. Base de Datos

### Tabla: `companies`
```sql
id          UUID PK
name        TEXT NOT NULL
owner_id    UUID FK → users(id)
plan        TEXT DEFAULT 'free'
created_at  TIMESTAMPTZ DEFAULT now()
```

### Tabla: `users` (extiende auth.users de Supabase)
```sql
id           UUID PK (= auth.users.id)
company_id   UUID FK → companies(id)
email        TEXT UNIQUE NOT NULL
full_name    TEXT
role         TEXT DEFAULT 'custom'  -- 'admin' | 'custom'
permissions  JSONB DEFAULT '{}'
created_at   TIMESTAMPTZ DEFAULT now()
```

**Estructura del campo `permissions` (JSONB):**
```json
{
  "clients": ["uuid-1", "uuid-2"],
  "can_publish": true,
  "can_schedule": true,
  "can_view_analytics": true,
  "can_manage_accounts": false
}
```
El rol `admin` ignora `permissions` y tiene acceso total.

### Tabla: `clients`
```sql
id          UUID PK
company_id  UUID FK → companies(id)
name        TEXT NOT NULL
logo_url    TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

### Tabla: `social_accounts`
```sql
id               UUID PK
client_id        UUID FK → clients(id) ON DELETE CASCADE
platform         TEXT NOT NULL  -- 'instagram' | 'facebook' | 'tiktok'
username         TEXT NOT NULL
credentials_enc  TEXT           -- AES-256-GCM cifrado
access_token_enc TEXT           -- AES-256-GCM cifrado
last_sync        TIMESTAMPTZ
is_active        BOOLEAN DEFAULT true
added_by_id      UUID FK → users(id)
created_at       TIMESTAMPTZ DEFAULT now()
```

### Tabla: `scheduled_posts`
```sql
id                UUID PK
social_account_id UUID FK → social_accounts(id) ON DELETE CASCADE
content_type      TEXT NOT NULL  -- 'post' | 'reel' | 'story' | 'video'
caption           TEXT
media_url         TEXT           -- URL en Supabase Storage
scheduled_at      TIMESTAMPTZ NOT NULL
status            TEXT DEFAULT 'scheduled'  -- 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
error_msg         TEXT
created_by_id     UUID FK → users(id)
created_at        TIMESTAMPTZ DEFAULT now()
```

### Tabla: `post_metrics`
```sql
id                UUID PK
scheduled_post_id UUID FK → scheduled_posts(id) ON DELETE CASCADE
likes             INT DEFAULT 0
comments          INT DEFAULT 0
shares            INT DEFAULT 0
reach             INT DEFAULT 0
engagement_rate   FLOAT DEFAULT 0
fetched_at        TIMESTAMPTZ DEFAULT now()
```

### Row Level Security (RLS)
Todas las tablas tienen RLS activado. Cada query filtra automáticamente por `company_id` del usuario autenticado. Esto garantiza el aislamiento de datos entre agencias en la fase SaaS.

---

## 6. Sistema de Roles y Permisos

| Permiso | Admin | Custom (con permiso) | Custom (sin permiso) |
|---------|-------|---------------------|---------------------|
| Ver clientes asignados | ✅ todos | ✅ los asignados | ❌ |
| Ver analytics | ✅ | ✅ si `can_view_analytics` | ❌ |
| Programar posts | ✅ | ✅ si `can_schedule` | ❌ |
| Publicar inmediatamente | ✅ | ✅ si `can_publish` | ❌ |
| Agregar/eliminar cuentas sociales | ✅ | ❌ siempre | ❌ |
| Crear/eliminar usuarios | ✅ | ❌ siempre | ❌ |
| Asignar permisos | ✅ | ❌ siempre | ❌ |
| Agregar/eliminar clientes | ✅ | ❌ siempre | ❌ |

---

## 7. Páginas y Navegación

```
/login                    → Pantalla de login (público)
/                         → Dashboard general
/feed/[accountId]         → Feed nativo de una cuenta
/compose                  → Crear nuevo post/reel/story
/calendar                 → Calendario de posts programados
/analytics/[accountId]    → Analytics de una cuenta
/admin/users              → Gestión de usuarios (admin only)
/admin/clients            → Gestión de clientes (admin only)
/admin/accounts           → Gestión de cuentas sociales (admin only)
/settings                 → Configuración personal
```

### Layout principal

```
┌──────────────┬─────────────────────────────────────────┐
│   SIDEBAR    │              ÁREA PRINCIPAL             │
│  (fijo)      │                                         │
│              │  ┌─────────────────────────────────┐   │
│  🌸 Pascuas  │  │ TOPBAR: cuenta activa + acciones │   │
│              │  └─────────────────────────────────┘   │
│  Perfiles    │                                         │
│  ┌─────────┐ │         CONTENIDO DINÁMICO              │
│  │IG Client│ │                                         │
│  │FB Client│ │                                         │
│  │TK Client│ │                                         │
│  └─────────┘ │                                         │
│              │                                         │
│  ─────────  │                                         │
│  Dashboard   │                                         │
│  Calendario  │                                         │
│  Analytics   │                                         │
│  ─────────  │                                         │
│  [Admin]     │                                         │
│  Usuarios    │                                         │
│  Clientes    │                                         │
│  Cuentas     │                                         │
│  ─────────  │                                         │
│  Settings    │                                         │
└──────────────┴─────────────────────────────────────────┘
```

Estilo visual: corporativo/profesional (referencia: Slack, Notion, Linear). Colores sobrios, tipografía limpia, componentes shadcn/ui.

---

## 8. API Endpoints

### Auth
```
POST   /api/auth/logout
```
El login y manejo de sesión lo gestiona Supabase Auth directamente desde el cliente.

### Usuarios (admin only)
```
GET    /api/users                  → listar usuarios de la empresa
POST   /api/users                  → crear usuario + invitar por email
PATCH  /api/users/:id/permissions  → actualizar permisos
DELETE /api/users/:id              → eliminar usuario
```

### Clientes (admin only)
```
GET    /api/clients                → listar clientes
POST   /api/clients                → crear cliente
PATCH  /api/clients/:id            → editar cliente
DELETE /api/clients/:id            → eliminar cliente
```

### Cuentas sociales (admin only)
```
GET    /api/accounts               → listar cuentas
POST   /api/accounts               → agregar cuenta (cifra credenciales antes de guardar)
DELETE /api/accounts/:id           → eliminar cuenta
```

### Feed y contenido
```
GET    /api/feed/:accountId        → traer posts del feed (llama API social en servidor)
GET    /api/stories/:accountId     → traer stories activas
```

### Posts programados
```
GET    /api/posts                  → listar posts (filtrado por permisos)
POST   /api/posts                  → crear post/reel/story
PATCH  /api/posts/:id              → editar post
DELETE /api/posts/:id              → cancelar post
POST   /api/posts/:id/publish      → publicar inmediatamente
```

### Analytics
```
GET    /api/analytics/:accountId         → métricas generales de la cuenta
GET    /api/analytics/:accountId/posts   → métricas por post
```

### Cron (interno, no expuesto al cliente)
```
POST   /api/cron/publish           → ejecutado por Vercel Cron cada minuto
                                     busca posts con scheduled_at <= now() y status='scheduled'
                                     los publica y actualiza status
```

---

## 9. Flujos Clave

### Login persistente
1. Usuario entra a la URL
2. Supabase Auth verifica sesión activa (refresh token)
3. Si existe → redirige a Dashboard
4. Si no existe → muestra pantalla login
5. Login exitoso → sesión guardada en Supabase, dura hasta logout manual

### Agregar cuenta social (admin)
1. Admin entra a `/admin/accounts`
2. Click "Agregar cuenta" → modal
3. Selecciona plataforma + ingresa credenciales/token
4. API route cifra credenciales con AES-256-GCM antes de guardar en Supabase
5. Cuenta aparece en selector de perfiles del sidebar

### Ver feed de una cuenta
1. Usuario selecciona perfil en sidebar
2. App llama `GET /api/feed/:accountId`
3. API route descifra token, llama API oficial de la red social
4. Devuelve posts en JSON
5. Frontend renderiza feed nativo (sin navegador embebido)

### Programar un post
1. Click "+Nuevo Post"
2. Selecciona cuenta(s) destino (puede ser varias)
3. Selecciona tipo: post / reel / story
4. Sube media → guardada en Supabase Storage
5. Escribe caption + selecciona fecha/hora
6. Confirma → guardado en `scheduled_posts` con status `scheduled`
7. Vercel Cron Job ejecuta `/api/cron/publish` cada minuto
8. Cuando `scheduled_at <= now()` → publica y actualiza status a `published`

---

## 10. Seguridad

- Credenciales y tokens sociales cifrados con AES-256-GCM en reposo
- Las API calls a redes sociales ocurren exclusivamente en el servidor (API routes)
- RLS en Supabase: cada usuario solo ve datos de su empresa
- Variables de entorno para `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ENCRYPTION_KEY`
- Middleware Next.js valida sesión Supabase en cada request a rutas protegidas

---

## 11. Escalabilidad a Mobile

La arquitectura está preparada para mobile desde el inicio:
- Todo el estado y lógica de negocio vive en la API (Next.js routes)
- React Native consumirá los mismos endpoints REST
- Supabase tiene SDK nativo para React Native
- shadcn/ui no se usa en mobile, pero los componentes lógicos son reutilizables

---

## 12. Fuera de Scope (v1)

- OAuth flow embebido por cuenta (se usa user/password + access token por ahora)
- Responder comentarios/DMs desde la app
- Soporte para múltiples empresas en el panel (preparado en BD, no en UI)
- Planes de suscripción y billing
- Upload de video desde disco local (se usa URL externa o Supabase Storage)
