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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json()
  const { permissions } = body as { permissions: unknown }

  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return NextResponse.json({ error: 'permissions es requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, error } = await (adminClient
    .from('users') as any)
    .update({ permissions })
    .eq('id', params.id)
    .eq('company_id', guard.user.company_id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    console.error('[PATCH /api/users/:id/permissions]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user })
}
