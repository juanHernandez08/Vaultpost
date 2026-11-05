// app/api/accounts/route.ts
import { NextResponse } from 'next/server'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, first, tables } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-guard'
import { companyClientIds } from '@/lib/db/scope'
import { encrypt } from '@/lib/crypto'

// Forma segura: nunca exponer credentials_enc / access_token_enc
function toSafeAccount(row: typeof tables.social_accounts.$inferSelect, client: { id: string; name: string } | null) {
  return {
    id: row.id,
    client_id: row.client_id,
    platform: row.platform,
    username: row.username,
    is_active: row.is_active,
    added_by_id: row.added_by_id,
    created_at: row.created_at,
    client,
  }
}

export async function GET() {
  const guard = await requireAdminApi()
  if (guard.error) return guard.error

  const rows = await db.query.social_accounts.findMany({
    where: inArray(tables.social_accounts.client_id, companyClientIds(guard.user.company_id)),
    with: { client: { columns: { id: true, name: true } } },
    orderBy: [asc(tables.social_accounts.created_at)],
  })

  const accounts = rows.map((r) => toSafeAccount(r, r.client ?? null))
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

  // Verificar que el cliente pertenece a la empresa del admin (evita cross-tenant)
  const client = await db
    .select({ id: tables.clients.id, name: tables.clients.name })
    .from(tables.clients)
    .where(and(eq(tables.clients.id, client_id), eq(tables.clients.company_id, guard.user.company_id)))
    .then(first)

  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const access_token_enc = access_token?.trim() ? encrypt(access_token.trim()) : null

  const [inserted] = await db
    .insert(tables.social_accounts)
    .values({
      client_id,
      platform,
      username: username.trim(),
      access_token_enc,
      is_active: true,
      added_by_id: guard.user.id,
    })
    .returning()

  return NextResponse.json({ account: toSafeAccount(inserted, client) }, { status: 201 })
}
