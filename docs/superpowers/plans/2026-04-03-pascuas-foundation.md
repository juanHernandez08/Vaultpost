# Pascuas Webapp — Foundation (Plan 1/3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la base completa de Pascuas: proyecto Next.js 14 limpio, base de datos Supabase con esquema y RLS, autenticación persistente, layout profesional con sidebar + selector de perfiles, y dashboard home funcional.

**Architecture:** Next.js 14 (App Router) con TypeScript y Tailwind CSS como full-stack. Supabase maneja auth (sesiones persistentes) y PostgreSQL con Row Level Security. Middleware de Next.js protege todas las rutas. Utilidades de cifrado AES-256-GCM en `lib/crypto.ts` para credenciales sensibles que nunca salen del servidor.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, @supabase/ssr, Lucide React, Jest + ts-jest (tests de utilidades puras).

---

## Mapa de Archivos

```
pascuas/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Página de login
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Layout con sidebar + topbar
│   │   └── page.tsx                  # Dashboard home con stats
│   └── api/
│       └── auth/
│           └── logout/
│               └── route.ts          # POST /api/auth/logout
├── components/
│   ├── auth/
│   │   └── login-form.tsx            # Formulario de login (client component)
│   └── layout/
│       ├── sidebar.tsx               # Sidebar con selector de perfiles
│       └── topbar.tsx                # Topbar con avatar + dropdown
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Supabase client (browser)
│   │   └── server.ts                 # Supabase client (server/API routes)
│   ├── crypto.ts                     # AES-256-GCM encrypt/decrypt
│   ├── permissions.ts                # Helpers de permisos por rol
│   └── types.ts                      # Tipos TypeScript compartidos
├── __tests__/
│   ├── crypto.test.ts                # Tests de encrypt/decrypt
│   └── permissions.test.ts           # Tests de helpers de permisos
├── middleware.ts                     # Auth guard Next.js
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql            # Tablas y restricciones
│       └── 002_rls.sql               # Row Level Security policies
├── jest.config.ts                    # Configuración de Jest
├── .env.local                        # Variables de entorno (local)
├── .env.example                      # Plantilla de variables
└── vercel.json                       # Configuración futura de cron jobs
```

---

## Task 1: Limpiar el proyecto anterior

**Files:**
- Delete: `apps/`
- Delete: `packages/`
- Delete: `turbo.json`
- Delete: `start-windows.bat`
- Delete: `start.sh`
- Delete: `tsconfig.base.json`
- Delete: `package.json` (raíz)
- Delete: `package-lock.json`
- Delete: `Pascuas_4.zip`
- Delete: `.env`
- Delete: `.env.example`

- [ ] **Step 1: Eliminar directorios y archivos del proyecto anterior**

Ejecutar desde la raíz del proyecto (`C:\Users\Usuario\Documents\Trabajos Externos\Proyectos personales\Pascuas`):

```bash
rm -rf apps packages
rm -f turbo.json start-windows.bat start.sh tsconfig.base.json
rm -f package.json package-lock.json Pascuas_4.zip .env .env.example
```

En Windows (PowerShell):
```powershell
Remove-Item -Recurse -Force apps, packages
Remove-Item -Force turbo.json, start-windows.bat, start.sh, tsconfig.base.json
Remove-Item -Force package.json, package-lock.json, Pascuas_4.zip, .env, .env.example
```

- [ ] **Step 2: Verificar que solo quedan los archivos correctos**

```bash
ls -la
```

Expected: solo `.git/`, `.gitignore`, `.claude/`, `docs/`, `README.md`

- [ ] **Step 3: Commit de limpieza**

```bash
git add -A
git commit -m "chore: remove old electron/monorepo structure, pivot to webapp"
```

---

## Task 2: Scaffolding Next.js 14

**Files:**
- Create: toda la estructura base de Next.js en la raíz del proyecto

- [ ] **Step 1: Crear el proyecto Next.js en el directorio actual**

Desde la raíz (`C:\Users\Usuario\Documents\Trabajos Externos\Proyectos personales\Pascuas`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

Cuando pregunte si continuar con el directorio no vacío, responder **Yes**.

Expected output final:
```
✔ Would you like to proceed? … yes
✔ Installing dependencies...
Success! Created next app in .
```

- [ ] **Step 2: Verificar que el proyecto arranca**

```bash
npm run dev
```

Expected: servidor corriendo en `http://localhost:3000` con la página de bienvenida de Next.js.

Ctrl+C para detener.

- [ ] **Step 3: Reemplazar el contenido de `app/page.tsx` con un placeholder temporal**

```tsx
// app/page.tsx
export default function Home() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Pascuas — cargando...</h1></div>
}
```

- [ ] **Step 4: Limpiar el CSS global de Next.js (mantener solo Tailwind)**

Reemplazar `app/globals.css` con:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js 14 with typescript, tailwind, app router"
```

---

## Task 3: Instalar shadcn/ui y dependencias

**Files:**
- Create: `components/ui/` (generado por shadcn)
- Modify: `package.json`

- [ ] **Step 1: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
```

Responder:
- Which style? → **New York**
- Which base color? → **Zinc**
- CSS variables? → **Yes**

- [ ] **Step 2: Instalar componentes de shadcn necesarios para Foundation**

```bash
npx shadcn@latest add button input label card dropdown-menu avatar separator badge
```

Expected: crea `components/ui/button.tsx`, `components/ui/input.tsx`, etc.

- [ ] **Step 3: Instalar Supabase SSR y Lucide React**

```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react
```

- [ ] **Step 4: Instalar Jest para tests de utilidades**

```bash
npm install --save-dev jest ts-jest @types/jest
```

- [ ] **Step 5: Crear `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

- [ ] **Step 6: Agregar script de tests en `package.json`**

En la sección `"scripts"` de `package.json`, agregar:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 7: Verificar instalación**

```bash
npm run build
```

Expected: build exitoso sin errores.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui, supabase ssr, lucide-react, jest"
```

---

## Task 4: Configurar Supabase (manual — requiere acción humana)

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`

> ⚠️ Este task requiere crear el proyecto en supabase.com antes de continuar.

- [ ] **Step 1: Crear proyecto en Supabase**

1. Ir a https://supabase.com y crear cuenta (gratis)
2. Click "New Project"
3. Nombre: `pascuas`
4. Contraseña: generar una segura (guardarla)
5. Región: elegir la más cercana
6. Esperar 2 minutos a que el proyecto se cree

- [ ] **Step 2: Obtener las credenciales**

En el dashboard de Supabase:
1. Ir a **Settings → API**
2. Copiar:
   - **Project URL** (ej. `https://abcdefgh.supabase.co`)
   - **anon / public** key
   - **service_role** key (¡nunca exponerla al cliente!)

- [ ] **Step 3: Crear `supabase/migrations/001_schema.sql`**

```sql
-- supabase/migrations/001_schema.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Empresas / Agencias
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  owner_id    UUID,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('admin', 'custom')),
  permissions  JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK circular: companies.owner_id → users.id (se agrega después de crear users)
ALTER TABLE companies
  ADD CONSTRAINT fk_companies_owner
  FOREIGN KEY (owner_id) REFERENCES users(id);

-- Clientes de la agencia
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuentas de redes sociales de cada cliente
CREATE TABLE social_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  username         TEXT NOT NULL,
  credentials_enc  TEXT,
  access_token_enc TEXT,
  last_sync        TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  added_by_id      UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts programados
CREATE TABLE scheduled_posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  content_type      TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'story', 'video')),
  caption           TEXT,
  media_url         TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_msg         TEXT,
  created_by_id     UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Métricas de posts publicados
CREATE TABLE post_metrics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  likes             INT NOT NULL DEFAULT 0,
  comments          INT NOT NULL DEFAULT 0,
  shares            INT NOT NULL DEFAULT 0,
  reach             INT NOT NULL DEFAULT 0,
  engagement_rate   FLOAT NOT NULL DEFAULT 0,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Ejecutar `001_schema.sql` en Supabase**

1. Dashboard → **SQL Editor** → New query
2. Pegar el contenido de `001_schema.sql`
3. Click **Run**
4. Expected: `Success. No rows returned`

- [ ] **Step 5: Crear `supabase/migrations/002_rls.sql`**

```sql
-- supabase/migrations/002_rls.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- Activar RLS en todas las tablas
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics      ENABLE ROW LEVEL SECURITY;

-- Helper: obtener company_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: obtener role del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES: el usuario ve solo su empresa
CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "admins_update_company" ON companies
  FOR UPDATE USING (id = get_user_company_id() AND get_user_role() = 'admin');

-- USERS: ver compañeros de la misma empresa
CREATE POLICY "users_see_company_members" ON users
  FOR SELECT USING (company_id = get_user_company_id());

-- USERS: admin puede gestionar usuarios de su empresa
CREATE POLICY "admins_manage_users" ON users
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'admin'
  );

-- USERS: cada usuario puede actualizar su propio perfil
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- CLIENTS: todos los usuarios de la empresa ven sus clientes
CREATE POLICY "users_see_company_clients" ON clients
  FOR SELECT USING (company_id = get_user_company_id());

-- CLIENTS: solo admin gestiona clientes
CREATE POLICY "admins_manage_clients" ON clients
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'admin'
  );

-- SOCIAL_ACCOUNTS: usuarios ven cuentas de clientes de su empresa
CREATE POLICY "users_see_company_accounts" ON social_accounts
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = get_user_company_id()
    )
  );

-- SOCIAL_ACCOUNTS: solo admin gestiona cuentas
CREATE POLICY "admins_manage_accounts" ON social_accounts
  FOR ALL USING (
    get_user_role() = 'admin'
    AND client_id IN (
      SELECT id FROM clients WHERE company_id = get_user_company_id()
    )
  );

-- SCHEDULED_POSTS: usuarios ven posts de cuentas de su empresa
CREATE POLICY "users_see_company_posts" ON scheduled_posts
  FOR SELECT USING (
    social_account_id IN (
      SELECT sa.id FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );

-- SCHEDULED_POSTS: usuarios con permisos pueden crear/editar
CREATE POLICY "users_manage_posts" ON scheduled_posts
  FOR ALL USING (
    social_account_id IN (
      SELECT sa.id FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );

-- POST_METRICS: mismos accesos que scheduled_posts
CREATE POLICY "users_see_metrics" ON post_metrics
  FOR SELECT USING (
    scheduled_post_id IN (
      SELECT sp.id FROM scheduled_posts sp
      JOIN social_accounts sa ON sa.id = sp.social_account_id
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );
```

- [ ] **Step 6: Ejecutar `002_rls.sql` en Supabase**

1. Dashboard → **SQL Editor** → New query
2. Pegar el contenido de `002_rls.sql`
3. Click **Run**
4. Expected: `Success. No rows returned`

- [ ] **Step 7: Crear el registro inicial de la agencia y usuario admin**

En SQL Editor de Supabase, ejecutar:

```sql
-- Paso 1: Primero crear el usuario en Supabase Auth
-- Ve a Authentication → Users → Add user
-- Email: tu@email.com, Password: (la que quieras), Auto Confirm: ON
-- Copia el UUID del usuario creado

-- Paso 2: Reemplaza los valores y ejecuta:
DO $$
DECLARE
  v_user_id UUID := 'PEGAR-UUID-DEL-USUARIO-AQUI';
  v_company_id UUID;
BEGIN
  -- Crear la empresa
  INSERT INTO companies (name, plan)
  VALUES ('Mi Agencia', 'free')
  RETURNING id INTO v_company_id;

  -- Crear el perfil del admin
  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (
    v_user_id,
    v_company_id,
    'tu@email.com',
    'Admin',
    'admin'
  );

  -- Enlazar owner en companies
  UPDATE companies SET owner_id = v_user_id WHERE id = v_company_id;
END $$;
```

- [ ] **Step 8: Verificar la creación**

```sql
SELECT u.email, u.role, c.name as company FROM users u JOIN companies c ON c.id = u.company_id;
```

Expected: una fila con el admin y la empresa.

- [ ] **Step 9: Commit**

```bash
git add supabase/
git commit -m "feat: supabase schema migrations and RLS policies"
```

---

## Task 5: Tipos TypeScript compartidos

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Crear `lib/types.ts`**

```typescript
// lib/types.ts

export type Platform = 'instagram' | 'facebook' | 'tiktok'
export type UserRole = 'admin' | 'custom'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
export type ContentType = 'post' | 'reel' | 'story' | 'video'

export interface UserPermissions {
  clients?: string[]
  can_publish?: boolean
  can_schedule?: boolean
  can_view_analytics?: boolean
  can_manage_accounts?: boolean
}

export interface Company {
  id: string
  name: string
  owner_id: string | null
  plan: string
  created_at: string
}

export interface User {
  id: string
  company_id: string
  email: string
  full_name: string | null
  role: UserRole
  permissions: UserPermissions
  created_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  logo_url: string | null
  created_at: string
}

export interface SocialAccount {
  id: string
  client_id: string
  platform: Platform
  username: string
  last_sync: string | null
  is_active: boolean
  added_by_id: string | null
  created_at: string
}

export interface SocialAccountWithClient extends SocialAccount {
  client: Pick<Client, 'id' | 'name'> | null
}

export interface ScheduledPost {
  id: string
  social_account_id: string
  content_type: ContentType
  caption: string | null
  media_url: string | null
  scheduled_at: string
  status: PostStatus
  error_msg: string | null
  created_by_id: string | null
  created_at: string
}

export interface PostMetrics {
  id: string
  scheduled_post_id: string
  likes: number
  comments: number
  shares: number
  reach: number
  engagement_rate: number
  fetched_at: string
}

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at'>
        Update: Partial<Omit<Company, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
      }
      social_accounts: {
        Row: SocialAccount
        Insert: Omit<SocialAccount, 'id' | 'created_at'>
        Update: Partial<Omit<SocialAccount, 'id' | 'created_at'>>
      }
      scheduled_posts: {
        Row: ScheduledPost
        Insert: Omit<ScheduledPost, 'id' | 'created_at'>
        Update: Partial<Omit<ScheduledPost, 'id' | 'created_at'>>
      }
      post_metrics: {
        Row: PostMetrics
        Insert: Omit<PostMetrics, 'id'>
        Update: Partial<Omit<PostMetrics, 'id'>>
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: shared typescript types for all domain entities"
```

---

## Task 6: Utilidad de cifrado AES-256-GCM

**Files:**
- Create: `lib/crypto.ts`
- Create: `__tests__/crypto.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// __tests__/crypto.test.ts
import { encrypt, decrypt } from '@/lib/crypto'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ENCRYPTION_KEY: 'test-key-for-jest-32-chars-padded!' }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
})

test('encrypt devuelve string diferente al original', () => {
  const result = encrypt('mi-contraseña-secreta')
  expect(result).not.toBe('mi-contraseña-secreta')
  expect(result).toContain(':') // formato iv:authTag:ciphertext
})

test('encrypt + decrypt recupera el texto original', () => {
  const original = 'mi-contraseña-secreta'
  const encrypted = encrypt(original)
  const decrypted = decrypt(encrypted)
  expect(decrypted).toBe(original)
})

test('dos llamadas a encrypt producen resultados diferentes (IV aleatorio)', () => {
  const a = encrypt('mismo-texto')
  const b = encrypt('mismo-texto')
  expect(a).not.toBe(b)
})

test('decrypt con texto malformado lanza error', () => {
  expect(() => decrypt('no-es-formato-valido')).toThrow()
})
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
npm test -- --testPathPattern=crypto
```

Expected: `FAIL — Cannot find module '@/lib/crypto'`

- [ ] **Step 3: Implementar `lib/crypto.ts`**

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function deriveKey(masterKey: string): Buffer {
  // SHA-256 del master key → exactamente 32 bytes para AES-256
  return createHash('sha256').update(masterKey).digest()
}

/**
 * Cifra un string con AES-256-GCM.
 * Usa ENCRYPTION_KEY del entorno. Solo llamar desde el servidor.
 * @returns string en formato "ivHex:authTagHex:ciphertextHex"
 */
export function encrypt(plaintext: string): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno')

  const key = deriveKey(masterKey)
  const iv = randomBytes(12) // 96 bits para GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Descifra un string cifrado con encrypt().
 * Usa ENCRYPTION_KEY del entorno. Solo llamar desde el servidor.
 */
export function decrypt(encoded: string): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno')

  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Formato de texto cifrado inválido')

  const [ivHex, authTagHex, ciphertextHex] = parts
  const key = deriveKey(masterKey)
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
npm test -- --testPathPattern=crypto
```

Expected:
```
PASS __tests__/crypto.test.ts
  ✓ encrypt devuelve string diferente al original
  ✓ encrypt + decrypt recupera el texto original
  ✓ dos llamadas a encrypt producen resultados diferentes (IV aleatorio)
  ✓ decrypt con texto malformado lanza error
```

- [ ] **Step 5: Commit**

```bash
git add lib/crypto.ts __tests__/crypto.test.ts
git commit -m "feat: AES-256-GCM encrypt/decrypt utility with tests"
```

---

## Task 7: Helper de permisos

**Files:**
- Create: `lib/permissions.ts`
- Create: `__tests__/permissions.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// __tests__/permissions.test.ts
import {
  isAdmin,
  canViewClient,
  canSchedule,
  canPublish,
  canViewAnalytics,
  canManageAccounts,
} from '@/lib/permissions'
import type { User } from '@/lib/types'

const adminUser: User = {
  id: 'admin-1',
  company_id: 'company-1',
  email: 'admin@test.com',
  full_name: 'Admin',
  role: 'admin',
  permissions: {},
  created_at: '2026-01-01',
}

const customUserWithPerms: User = {
  id: 'user-1',
  company_id: 'company-1',
  email: 'user@test.com',
  full_name: 'User',
  role: 'custom',
  permissions: {
    clients: ['client-1', 'client-2'],
    can_publish: true,
    can_schedule: true,
    can_view_analytics: true,
    can_manage_accounts: false,
  },
  created_at: '2026-01-01',
}

const customUserNoPerms: User = {
  ...customUserWithPerms,
  id: 'user-2',
  permissions: {},
}

test('isAdmin: admin user returns true', () => {
  expect(isAdmin(adminUser)).toBe(true)
})

test('isAdmin: custom user returns false', () => {
  expect(isAdmin(customUserWithPerms)).toBe(false)
})

test('canViewClient: admin sees all clients', () => {
  expect(canViewClient(adminUser, 'any-client-id')).toBe(true)
})

test('canViewClient: custom user sees only assigned clients', () => {
  expect(canViewClient(customUserWithPerms, 'client-1')).toBe(true)
  expect(canViewClient(customUserWithPerms, 'client-999')).toBe(false)
})

test('canViewClient: custom user without clients sees nothing', () => {
  expect(canViewClient(customUserNoPerms, 'client-1')).toBe(false)
})

test('canSchedule: admin always true', () => {
  expect(canSchedule(adminUser)).toBe(true)
})

test('canSchedule: respects permissions flag', () => {
  expect(canSchedule(customUserWithPerms)).toBe(true)
  expect(canSchedule(customUserNoPerms)).toBe(false)
})

test('canPublish: admin always true', () => {
  expect(canPublish(adminUser)).toBe(true)
})

test('canPublish: respects permissions flag', () => {
  expect(canPublish(customUserWithPerms)).toBe(true)
  expect(canPublish(customUserNoPerms)).toBe(false)
})

test('canViewAnalytics: respects permissions flag', () => {
  expect(canViewAnalytics(adminUser)).toBe(true)
  expect(canViewAnalytics(customUserWithPerms)).toBe(true)
  expect(canViewAnalytics(customUserNoPerms)).toBe(false)
})

test('canManageAccounts: only admin', () => {
  expect(canManageAccounts(adminUser)).toBe(true)
  expect(canManageAccounts(customUserWithPerms)).toBe(false)
  expect(canManageAccounts(customUserNoPerms)).toBe(false)
})
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
npm test -- --testPathPattern=permissions
```

Expected: `FAIL — Cannot find module '@/lib/permissions'`

- [ ] **Step 3: Implementar `lib/permissions.ts`**

```typescript
// lib/permissions.ts
import type { User, UserPermissions } from '@/lib/types'

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

export function canViewClient(user: User, clientId: string): boolean {
  if (isAdmin(user)) return true
  const perms = user.permissions as UserPermissions
  if (!perms.clients || perms.clients.length === 0) return false
  return perms.clients.includes(clientId)
}

export function canSchedule(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_schedule
}

export function canPublish(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_publish
}

export function canViewAnalytics(user: User): boolean {
  if (isAdmin(user)) return true
  return !!(user.permissions as UserPermissions).can_view_analytics
}

export function canManageAccounts(user: User): boolean {
  return isAdmin(user)
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
npm test -- --testPathPattern=permissions
```

Expected:
```
PASS __tests__/permissions.test.ts
  ✓ isAdmin: admin user returns true
  ✓ isAdmin: custom user returns false
  ✓ canViewClient: admin sees all clients
  ... (11 tests)
```

- [ ] **Step 5: Ejecutar todos los tests**

```bash
npm test
```

Expected: todos los tests pasan.

- [ ] **Step 6: Commit**

```bash
git add lib/permissions.ts __tests__/permissions.test.ts
git commit -m "feat: permission helpers with tests"
```

---

## Task 8: Clientes de Supabase (browser + server)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Crear `lib/supabase/client.ts` (para componentes cliente)**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Crear `lib/supabase/server.ts` (para Server Components y API routes)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components no pueden setear cookies — se ignora
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/
git commit -m "feat: supabase browser and server clients with typescript generics"
```

---

## Task 9: Middleware de autenticación

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Crear `middleware.ts`**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión (mantiene el refresh token activo)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api')
  const isCronRoute = pathname.startsWith('/api/cron')

  // Las rutas de cron se autentican con CRON_SECRET, no con sesión de usuario
  if (isCronRoute) return supabaseResponse

  // Rutas de API: dejar pasar (cada handler valida sesión individualmente)
  if (isApiRoute) return supabaseResponse

  // Usuario no autenticado intentando acceder a ruta protegida
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Usuario autenticado intentando acceder a login
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: next.js auth middleware with supabase session refresh"
```

---

## Task 10: Variables de entorno

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `vercel.json`

- [ ] **Step 1: Crear `.env.example`**

```bash
# .env.example
# Copiar a .env.local y rellenar con los valores reales de Supabase

# Supabase — Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_KEY=tu-service-role-key-aqui

# Cifrado de credenciales sociales — generar con: openssl rand -hex 32
ENCRYPTION_KEY=genera-una-clave-aleatoria-de-al-menos-32-chars

# Cron job secret — generar con: openssl rand -hex 16
CRON_SECRET=genera-otro-secret-para-el-cron
```

- [ ] **Step 2: Crear `.env.local` con los valores reales**

```bash
# .env.local (NO commitear — ya está en .gitignore)
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY
SUPABASE_SERVICE_KEY=TU-SERVICE-ROLE-KEY
ENCRYPTION_KEY=TU-CLAVE-DE-32-CHARS-MINIMO
CRON_SECRET=TU-CRON-SECRET
```

- [ ] **Step 3: Verificar que `.env.local` está en `.gitignore`**

Abrir `.gitignore` y confirmar que contiene:
```
.env*.local
```

Si no está, agregarlo.

- [ ] **Step 4: Crear `vercel.json` con placeholder de cron**

```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "* * * * *"
    }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add .env.example vercel.json .gitignore
git commit -m "chore: env variables template and vercel cron config"
```

---

## Task 11: Login page + form

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `components/auth/login-form.tsx`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Crear `app/(auth)/login/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Crear `components/auth/login-form.tsx`**

```tsx
// components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Crear `app/api/auth/logout/route.ts`**

```typescript
// app/api/auth/logout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
```

- [ ] **Step 4: Verificar login manualmente**

```bash
npm run dev
```

1. Ir a `http://localhost:3000` → debe redirigir a `/login`
2. Ingresar las credenciales del admin creado en Task 4
3. Expected: redirige a `/` (muestra "Pascuas — cargando...")
4. Refrescar la página → no pide login de nuevo (sesión persistente)

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/ components/auth/ app/api/auth/
git commit -m "feat: login page with persistent supabase session"
```

---

## Task 12: Layout del dashboard (sidebar + topbar)

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/topbar.tsx`

- [ ] **Step 1: Crear `components/layout/sidebar.tsx`**

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { SocialAccountWithClient } from '@/lib/types'
import {
  LayoutDashboard,
  Calendar,
  BarChart2,
  Settings,
  Users,
  Building2,
  AtSign,
  PenSquare,
} from 'lucide-react'

interface SidebarProps {
  accounts: SocialAccountWithClient[]
  userRole: string
}

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook:  { bg: 'bg-blue-600',  label: 'FB' },
  tiktok:    { bg: 'bg-zinc-900',  label: 'TK' },
}

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
  exact = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  pathname: string
  exact?: boolean
}) {
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-zinc-100 text-zinc-900 font-medium'
          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  )
}

export function Sidebar({ accounts, userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-zinc-200 px-5">
        <span className="text-lg font-bold text-zinc-900">🌸 Pascuas</span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        {/* Selector de perfiles */}
        {accounts.length > 0 && (
          <div className="px-3 mb-2">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Perfiles
            </p>
            <div className="space-y-0.5">
              {accounts.map((account) => {
                const style = PLATFORM_STYLES[account.platform]
                const isActive = pathname === `/feed/${account.id}`
                return (
                  <Link
                    key={account.id}
                    href={`/feed/${account.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white',
                        style.bg
                      )}
                    >
                      {style.label}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">
                        {account.client?.name ?? 'Cliente'}
                      </p>
                      <p className="truncate text-xs text-zinc-400">@{account.username}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="mx-3 my-2 border-t border-zinc-100" />

        {/* Navegación principal */}
        <nav className="space-y-0.5 px-3">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" pathname={pathname} exact />
          <NavItem href="/compose" icon={PenSquare} label="Nuevo Post" pathname={pathname} />
          <NavItem href="/calendar" icon={Calendar} label="Calendario" pathname={pathname} />
          <NavItem href="/analytics" icon={BarChart2} label="Analytics" pathname={pathname} />
        </nav>

        {/* Sección Admin */}
        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-zinc-100" />
            <div className="px-3">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Admin
              </p>
              <nav className="space-y-0.5">
                <NavItem href="/admin/users" icon={Users} label="Usuarios" pathname={pathname} />
                <NavItem href="/admin/clients" icon={Building2} label="Clientes" pathname={pathname} />
                <NavItem href="/admin/accounts" icon={AtSign} label="Cuentas" pathname={pathname} />
              </nav>
            </div>
          </>
        )}

        {/* Parte inferior */}
        <div className="mt-auto px-3">
          <div className="mb-2 border-t border-zinc-100" />
          <NavItem href="/settings" icon={Settings} label="Configuración" pathname={pathname} />
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Crear `components/layout/topbar.tsx`**

```tsx
// components/layout/topbar.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, UserIcon } from 'lucide-react'
import type { User, Company } from '@/lib/types'

interface TopbarProps {
  user: (User & { company: Company | null }) | null
}

function getInitials(user: User | null): string {
  if (!user) return '??'
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.email.slice(0, 2).toUpperCase()
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <p className="text-sm font-medium text-zinc-400">
        {user?.company?.name ?? 'Mi agencia'}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 px-2 py-1.5 h-auto hover:bg-zinc-50"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-medium leading-tight text-zinc-900">
                {user?.full_name ?? user?.email}
              </p>
              <p className="text-xs capitalize leading-tight text-zinc-400">{user?.role}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-normal text-xs text-zinc-400">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <UserIcon className="mr-2 h-4 w-4" />
            Configuración
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 3: Crear `app/(dashboard)/layout.tsx`**

```tsx
// app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { SocialAccountWithClient } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  // Perfil del usuario con datos de la empresa
  const { data: profile } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', authUser.id)
    .single()

  // Cuentas sociales para el selector de perfiles en el sidebar
  const { data: rawAccounts } = await supabase
    .from('social_accounts')
    .select('*, client:clients(id, name)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const accounts = (rawAccounts ?? []) as SocialAccountWithClient[]

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar accounts={accounts} userRole={profile?.role ?? 'custom'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={profile as any} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar el layout manualmente**

```bash
npm run dev
```

1. Login en `/login`
2. Expected: ver sidebar con logo, navegación, y sección admin (si el usuario es admin)
3. Expected: topbar con nombre del usuario y dropdown
4. Click "Cerrar sesión" → redirige a `/login`
5. Intentar acceder a `/` sin sesión → redirige a `/login`

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/layout.tsx components/layout/
git commit -m "feat: dashboard layout with sidebar profile selector and topbar"
```

---

## Task 13: Dashboard home page

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Create: `app/(dashboard)/feed/[accountId]/page.tsx` (placeholder)
- Create: `app/(dashboard)/compose/page.tsx` (placeholder)
- Create: `app/(dashboard)/calendar/page.tsx` (placeholder)
- Create: `app/(dashboard)/analytics/page.tsx` (placeholder)
- Create: `app/(dashboard)/settings/page.tsx` (placeholder)
- Create: `app/(dashboard)/admin/users/page.tsx` (placeholder)
- Create: `app/(dashboard)/admin/clients/page.tsx` (placeholder)
- Create: `app/(dashboard)/admin/accounts/page.tsx` (placeholder)

- [ ] **Step 1: Reemplazar `app/(dashboard)/page.tsx` con el dashboard real**

```tsx
// app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, AtSign, Clock, CheckCircle2 } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: clientsCount },
    { count: accountsCount },
    { count: pendingCount },
    { count: publishedCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled'),
    supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
  ])

  const stats = [
    {
      label: 'Clientes',
      value: clientsCount ?? 0,
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Cuentas activas',
      value: accountsCount ?? 0,
      icon: AtSign,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      label: 'Posts pendientes',
      value: pendingCount ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Publicados',
      value: publishedCount ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Resumen general de tu agencia</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-zinc-500">{stat.label}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear placeholders para rutas que se implementan en Plan 2 y Plan 3**

```tsx
// app/(dashboard)/feed/[accountId]/page.tsx
export default function FeedPage({ params }: { params: { accountId: string } }) {
  return <div className="p-4 text-zinc-500">Feed — próximamente (Plan 3)</div>
}
```

```tsx
// app/(dashboard)/compose/page.tsx
export default function ComposePage() {
  return <div className="p-4 text-zinc-500">Nuevo Post — próximamente (Plan 3)</div>
}
```

```tsx
// app/(dashboard)/calendar/page.tsx
export default function CalendarPage() {
  return <div className="p-4 text-zinc-500">Calendario — próximamente (Plan 3)</div>
}
```

```tsx
// app/(dashboard)/analytics/page.tsx
export default function AnalyticsPage() {
  return <div className="p-4 text-zinc-500">Analytics — próximamente (Plan 3)</div>
}
```

```tsx
// app/(dashboard)/settings/page.tsx
export default function SettingsPage() {
  return <div className="p-4 text-zinc-500">Configuración — próximamente</div>
}
```

```tsx
// app/(dashboard)/admin/users/page.tsx
export default function AdminUsersPage() {
  return <div className="p-4 text-zinc-500">Gestión de usuarios — próximamente (Plan 2)</div>
}
```

```tsx
// app/(dashboard)/admin/clients/page.tsx
export default function AdminClientsPage() {
  return <div className="p-4 text-zinc-500">Gestión de clientes — próximamente (Plan 2)</div>
}
```

```tsx
// app/(dashboard)/admin/accounts/page.tsx
export default function AdminAccountsPage() {
  return <div className="p-4 text-zinc-500">Gestión de cuentas — próximamente (Plan 2)</div>
}
```

- [ ] **Step 3: Verificar la app completa**

```bash
npm run dev
```

1. Login → ver dashboard con 4 tarjetas de stats (valores en 0 al inicio)
2. Navegar por todos los links del sidebar → no hay errores 404
3. Click en "Admin" → ver secciones de admin (si rol es admin)
4. Dropdown del topbar → click "Cerrar sesión" → redirect a login
5. Refrescar → sesión sigue activa

- [ ] **Step 4: Build de producción sin errores**

```bash
npm run build
```

Expected: build exitoso. 0 errores de TypeScript.

- [ ] **Step 5: Commit final del Plan 1**

```bash
git add -A
git commit -m "feat: dashboard home page with stats cards and placeholder routes"
```

---

## Self-Review

### Cobertura del spec

| Requisito del spec | Task que lo implementa |
|-------------------|----------------------|
| Next.js 14 + TypeScript + Tailwind + shadcn/ui | Task 2, Task 3 |
| Supabase PostgreSQL con esquema completo | Task 4 |
| RLS para aislamiento multi-tenant | Task 4 (002_rls.sql) |
| AES-256-GCM cifrado de credenciales | Task 6 |
| Sistema de roles (admin/custom) + helpers | Task 7 |
| Sesión persistente (login único) | Task 9 (middleware) + Task 11 |
| Redirect automático a login si no autenticado | Task 9 |
| Sidebar con selector de perfiles | Task 12 |
| Topbar con avatar + logout | Task 12 |
| Dashboard home con stats | Task 13 |
| Variables de entorno documentadas | Task 10 |
| vercel.json para cron | Task 10 |

### Gaps confirmados como intencionales
- Feed, Stories, Compose, Calendar, Analytics, Cron → **Plan 3**
- Admin de Usuarios, Clientes, Cuentas → **Plan 2**
- No hay placeholders (todas las páginas pendientes tienen componentes de placeholder explícitos)

---

## Próximos Planes

- **Plan 2 — Admin Panel** (`2026-04-03-pascuas-admin.md`): CRUD de usuarios con permisos granulares, CRUD de clientes, gestión de cuentas sociales con cifrado
- **Plan 3 — Core Features** (`2026-04-03-pascuas-features.md`): Feed de Instagram/Facebook/TikTok, Compose (posts/reels/stories), Calendario, Analytics, Cron job de publicación
