import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-guard'
import { UsersClient } from '@/components/admin/users/users-client'
import type { User, Client } from '@/lib/types'

export default async function AdminUsersPage() {
  const profile = await requireAdmin()
  const supabase = createClient()

  const [{ data: users }, { data: clients }] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: true }),
    supabase.from('clients').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="p-6">
      <UsersClient
        initialUsers={(users ?? []) as User[]}
        clients={(clients ?? []) as Client[]}
        currentUserId={profile.id}
      />
    </div>
  )
}
