import { redirect } from 'next/navigation'
import { getCurrentUserWithCompany, type ProfileWithCompany } from '@/lib/auth/user'

export type { ProfileWithCompany }

// Sin perfil (cookie sin usuario en la base): cerrar sesión y volver al login
export async function requireAdmin(): Promise<ProfileWithCompany> {
  const profile = await getCurrentUserWithCompany()

  if (!profile) redirect('/api/auth/logout')
  if (profile.role !== 'admin') redirect('/')

  return profile
}
