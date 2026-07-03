import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Temporary debug endpoint — DELETE after diagnosing RLS issue
export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  // 1. Auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  // 2. Profile via user-session (subject to RLS)
  const { data: profileRLS, error: profileRLSError } = await supabase
    .from('users')
    .select('*, company:companies!users_company_id_fkey(*)')
    .eq('id', authUser?.id ?? '')
    .single()

  // 3. Profile via admin client (bypasses RLS)
  const { data: profileAdmin, error: profileAdminError } = await admin
    .from('users')
    .select('*, company:companies!users_company_id_fkey(*)')
    .eq('id', authUser?.id ?? '')
    .single()

  // 4. Test helper functions
  let helperResults = null
  if (authUser) {
    const { data: companyId, error: companyIdError } = await supabase.rpc('get_user_company_id')
    const { data: role, error: roleError } = await supabase.rpc('get_user_role')
    helperResults = {
      get_user_company_id: { data: companyId, error: companyIdError?.message },
      get_user_role: { data: role, error: roleError?.message },
    }
  }

  // 5. Skip policies check (no exec_sql available)
  const policies = null

  return NextResponse.json({
    authUser: authUser ? { id: authUser.id, email: authUser.email } : null,
    authError: authError?.message,
    profileRLS: profileRLS,
    profileRLSError: profileRLSError?.message,
    profileAdmin: profileAdmin,
    profileAdminError: profileAdminError?.message,
    helperFunctions: helperResults,
    policies,
  }, { status: 200 })
}
