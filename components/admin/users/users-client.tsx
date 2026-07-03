// components/admin/users/users-client.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User, Client, UserPermissions } from '@/lib/types'

interface UsersClientProps {
  initialUsers: User[]
  clients: Client[]
  currentUserId: string
}

export function UsersClient({ initialUsers, clients, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [createOpen, setCreateOpen] = useState(false)
  const [permOpen, setPermOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Create form
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'custom'>('custom')

  // Permissions form
  const [perms, setPerms] = useState<UserPermissions>({
    can_schedule: false,
    can_publish: false,
    can_view_analytics: false,
    can_manage_accounts: false,
    clients: [],
  })

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => [...prev, data.user as User])
      setCreateOpen(false)
      setEmail(''); setFullName(''); setPassword(''); setRole('custom')
      toast.success('Usuario creado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  function openPerms(user: User) {
    setSelectedUser(user)
    const p = user.permissions
    setPerms({
      can_schedule: p?.can_schedule ?? false,
      can_publish: p?.can_publish ?? false,
      can_view_analytics: p?.can_view_analytics ?? false,
      can_manage_accounts: p?.can_manage_accounts ?? false,
      clients: p?.clients ?? [],
    })
    setPermOpen(true)
  }

  async function handleSavePerms() {
    if (!selectedUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => (u.id === selectedUser.id ? (data.user as User) : u)))
      setPermOpen(false)
      toast.success('Permisos actualizados')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar permisos')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('Usuario eliminado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar usuario')
    }
  }

  function toggleClient(clientId: string) {
    setPerms(prev => ({
      ...prev,
      clients: prev.clients?.includes(clientId)
        ? prev.clients.filter(c => c !== clientId)
        : [...(prev.clients ?? []), clientId],
    }))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuarios</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestiona los miembros de tu agencia</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name ?? '—'}</TableCell>
                <TableCell className="text-zinc-500">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {new Date(user.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.role === 'custom' && (
                      <Button variant="outline" size="sm" onClick={() => openPerms(user)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                    {user.id !== currentUserId && (
                      <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-zinc-400">
                  No hay usuarios aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Create user */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan García"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@agencia.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña temporal</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={v => setRole(v as 'admin' | 'custom')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !email.trim() || !fullName.trim() || !password}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit permissions */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos — {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">Capacidades</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_schedule"
                  checked={perms.can_schedule ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_schedule: !!v }))}
                />
                <Label htmlFor="can_schedule" className="font-normal">Programar posts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_publish"
                  checked={perms.can_publish ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_publish: !!v }))}
                />
                <Label htmlFor="can_publish" className="font-normal">Publicar inmediatamente</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_view_analytics"
                  checked={perms.can_view_analytics ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_view_analytics: !!v }))}
                />
                <Label htmlFor="can_view_analytics" className="font-normal">Ver analytics</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can_manage_accounts"
                  checked={perms.can_manage_accounts ?? false}
                  onCheckedChange={v => setPerms(p => ({ ...p, can_manage_accounts: !!v }))}
                />
                <Label htmlFor="can_manage_accounts" className="font-normal">Gestionar cuentas</Label>
              </div>
            </div>
            {clients.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700">Clientes asignados</p>
                {clients.map(client => (
                  <div key={client.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={perms.clients?.includes(client.id) ?? false}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <Label htmlFor={`client-${client.id}`} className="font-normal">
                      {client.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPermOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePerms} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Permisos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
