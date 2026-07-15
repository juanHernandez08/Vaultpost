// components/settings/settings-client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { User } from '@/lib/types'
import { validatePassword } from '@/lib/validation'

interface SettingsClientProps {
  user: User
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // Profile section
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password section
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Logout
  const [logoutLoading, setLogoutLoading] = useState(false)

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileLoading(true)

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() || null })
      .eq('id', user.id)

    setProfileLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Perfil actualizado')
    router.refresh()
  }

  function handleNewPasswordChange(value: string) {
    setNewPassword(value)
    setPasswordError(value ? validatePassword(value) : null)
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const pwdErr = validatePassword(newPassword)
    if (pwdErr) {
      setPasswordError(pwdErr)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    setPasswordLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setPasswordLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Contraseña actualizada')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  async function handleLogout() {
    setLogoutLoading(true)

    const res = await fetch('/api/auth/logout', { method: 'POST' })

    if (!res.ok) {
      setLogoutLoading(false)
      toast.error('Error al cerrar sesión')
      return
    }

    router.push('/login')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Configuración</h1>
        <p className="text-sm text-zinc-500">Administrá tu cuenta y preferencias</p>
      </div>

      {/* Profile card */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Perfil</CardTitle>
          <CardDescription>Actualizá tu información personal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                disabled={profileLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-zinc-50 text-zinc-400 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-400">El correo electrónico no se puede cambiar</p>
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password card */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Contraseña</CardTitle>
          <CardDescription>Cambiá tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                disabled={passwordLoading}
              />
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
              {newPassword && !passwordError && (
                <p className="text-xs text-emerald-600">Contraseña válida</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
                disabled={passwordLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword || !!passwordError}
            >
              {passwordLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session card */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Sesión</CardTitle>
          <CardDescription>Cerrá tu sesión en este dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
