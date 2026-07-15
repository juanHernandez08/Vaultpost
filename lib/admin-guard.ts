import { redirect } from 'next/navigation'
import { getCurrentUserWithCompany, type ProfileWithCompany } from '@/lib/auth/user'

export type { ProfileWithCompany }

export async function requireAdmin(): Promise<ProfileWithCompany> {
  const profile = await getCurrentUserWithCompany()

  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/')

  return profile
}
