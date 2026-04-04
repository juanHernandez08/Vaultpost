# User Registration Design

## Context

OmniMark is a SaaS platform. The `companies` table holds the list of client companies that use the platform (e.g. Juppao). Each company has multiple `users` (their employees). Currently, the first admin is created manually via Supabase Dashboard + seed SQL. This spec replaces that with a self-service registration flow on the login page.

Subsequent users (non-first) are created by an admin via the existing `/admin/users` panel.

## User Flow

1. New employee of a company opens OmniMark
2. On the login page, clicks "¿No tenés cuenta? Registrate"
3. Fills in: company (dropdown), full name, email, password
4. Submits — account is created and they are logged in automatically
5. Role is determined server-side: first user for a company → `admin`; any subsequent → `custom`

## Architecture

**Option chosen: A — Server component + client toggle**

```
app/(auth)/login/page.tsx   (server component)
  └── fetches companies[] via adminClient (no RLS)
  └── renders <LoginForm companies={companies} />

components/auth/login-form.tsx   (client component)
  └── state: mode = 'login' | 'register'
  └── login mode  → signInWithPassword() → redirect /
  └── register mode → POST /api/auth/register → signInWithPassword() → redirect /

app/api/auth/register/route.ts   (public POST endpoint)
  └── uses adminClient throughout (no user session)
```

## API: POST /api/auth/register

**Auth required:** none (public)

**Body:**
```json
{ "company_id": "uuid", "full_name": "string", "email": "string", "password": "string" }
```

**Logic:**
1. Validate all fields present
2. Validate password: min 8 chars, at least 1 uppercase, at least 1 number
3. Verify company_id exists in `companies`
4. Count users with that company_id → role = count === 0 ? 'admin' : 'custom'
5. Create auth.users via `adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`
6. Insert into `public.users { id, company_id, email, full_name, role, permissions: {} }`
7. On step 6 failure → `adminClient.auth.admin.deleteUser(authUser.id)` then return 500
8. Return `{ user }` with status 201

**Error responses:**
- Missing fields → 400 "company_id, full_name, email y password son requeridos"
- Weak password → 400 "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"
- Invalid company → 400 "Empresa no encontrada"
- Email already in use → 400 (Supabase message forwarded)
- DB insert failure → 500 (after rollback)

## LoginForm Changes

**New prop:** `companies: Pick<Company, 'id' | 'name'>[]`

**New state:**
- `mode: 'login' | 'register'`
- `companyId: string`
- `fullName: string`
- `passwordError: string | null` — inline validation message

**Password validation (client-side, runs on change):**
```
/[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8
```

**Register submit flow:**
1. Validate password client-side → show inline error, block submit
2. POST /api/auth/register
3. On 201 → `supabase.auth.signInWithPassword({ email, password })` → `router.push('/')`
4. On error → show error in red box (same pattern as login)

**UI toggle:** Text link below the submit button:
- Login mode: "¿No tenés cuenta? Registrate"
- Register mode: "¿Ya tenés cuenta? Iniciá sesión"

## Login Page Changes

- Mark page as `async`
- Import `createAdminClient` and `Company` type
- Fetch `companies` with `adminClient.from('companies').select('id, name').order('name')`
- Pass to `<LoginForm companies={companies} />`
- Update header: replace `🌸` emoji with `OM` badge, title "OmniMark", subtitle "Gestión de redes sociales"

## What This Does NOT Cover

- Password reset flow
- Email verification (email_confirm: true bypasses this)
- Invite-only registration (open registration by company selector)
- Super-admin panel for managing companies (companies are added manually to DB for now)
