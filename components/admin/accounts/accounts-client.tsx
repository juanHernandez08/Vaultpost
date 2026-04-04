// components/admin/accounts/accounts-client.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Client } from '@/lib/types'

export type AccountRow = {
  id: string
  platform: string
  username: string
  is_active: boolean
  created_at: string
  client: { id: string; name: string } | null
}

type AccountsClientProps = {
  initialAccounts: AccountRow[]
  clients: Client[]
}

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent',
  facebook: 'bg-blue-600 text-white border-transparent',
  tiktok: 'bg-zinc-900 text-white border-transparent',
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

export function AccountsClient({ initialAccounts, clients }: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [platform, setPlatform] = useState('')
  const [username, setUsername] = useState('')
  const [accessToken, setAccessToken] = useState('')

  function openAdd() {
    setClientId(''); setPlatform(''); setUsername(''); setAccessToken('')
    setDialogOpen(true)
  }

  async function handleAdd() {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          platform,
          username,
          access_token: accessToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const clientInfo = clients.find(c => c.id === clientId) ?? null
      const newAccount: AccountRow = {
        ...data.account,
        client: clientInfo ? { id: clientInfo.id, name: clientInfo.name } : null,
      }
      setAccounts(prev => [...prev, newAccount])
      setDialogOpen(false)
      toast.success('Cuenta agregada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar cuenta')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('¿Eliminar esta cuenta social? Se eliminarán también sus posts programados.')) return
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      toast.success('Cuenta eliminada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cuentas Sociales</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestiona las cuentas de redes sociales de tus clientes
          </p>
        </div>
        <Button onClick={openAdd} disabled={clients.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Cuenta
        </Button>
      </div>

      {clients.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Debes crear al menos un cliente antes de agregar cuentas sociales.
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plataforma</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Agregada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => (
              <TableRow key={account.id}>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_BADGE[account.platform] ?? 'bg-zinc-100 text-zinc-800 border-zinc-200'}`}
                  >
                    {PLATFORM_LABEL[account.platform] ?? account.platform}
                  </span>
                </TableCell>
                <TableCell className="font-medium">@{account.username}</TableCell>
                <TableCell className="text-zinc-500">{account.client?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={account.is_active ? 'default' : 'secondary'}>
                    {account.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {new Date(account.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-zinc-400">
                  No hay cuentas sociales aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Cuenta Social</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Plataforma *</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-username">Username *</Label>
              <Input
                id="acc-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="nombre_usuario (sin @)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="access-token">Access Token (opcional)</Label>
              <Input
                id="access-token"
                type="password"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="Token de la API de la plataforma"
              />
              <p className="text-xs text-zinc-400">
                El token se cifra con AES-256-GCM y nunca se muestra en la UI.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading || !clientId || !platform || !username.trim()}
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
