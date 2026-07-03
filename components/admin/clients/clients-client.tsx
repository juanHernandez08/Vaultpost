'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Client, SocialAccount } from '@/lib/types'

type ClientWithAccounts = Client & { social_accounts: SocialAccount[] }

const PLATFORMS = ['tiktok', 'instagram', 'facebook'] as const
type PlatformType = typeof PLATFORMS[number]

const PLATFORM_CONFIG: Record<PlatformType, { label: string; bg: string; abbr: string }> = {
  tiktok:    { label: 'TikTok',    bg: 'bg-zinc-900',  abbr: 'TK' },
  instagram: { label: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 to-pink-500', abbr: 'IG' },
  facebook:  { label: 'Facebook',  bg: 'bg-blue-600',  abbr: 'FB' },
}

const FILTER_OPTIONS = [
  { value: 'all',       label: 'Todos' },
  { value: 'tiktok',    label: 'Con TikTok' },
  { value: 'instagram', label: 'Con Instagram' },
  { value: 'facebook',  label: 'Con Facebook' },
]

interface ClientsClientProps {
  initialClients: ClientWithAccounts[]
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const [clients, setClients] = useState<ClientWithAccounts[]>(initialClients)
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filtered clients
  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchesPlatform = platformFilter === 'all'
        ? true
        : c.social_accounts.some(a => a.platform === platformFilter)
      return matchesSearch && matchesPlatform
    })
  }, [clients, search, platformFilter])

  function openCreate() {
    setEditing(null)
    setName('')
    setLogoUrl('')
    setDialogOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setName(client.name)
    setLogoUrl(client.logo_url ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editing) {
        const res = await fetch(`/api/clients/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), logo_url: logoUrl.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClients(prev =>
          prev.map(c => c.id === editing.id ? { ...c, ...data.client } : c)
        )
        toast.success('Cliente actualizado')
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), logo_url: logoUrl.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClients(prev => [...prev, { ...data.client, social_accounts: [] }])
        toast.success('Cliente creado')
      }
      setDialogOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(clientId: string) {
    if (!confirm('¿Eliminar este cliente? Se eliminarán también sus cuentas sociales y posts programados.')) return
    setDeletingId(clientId)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClients(prev => prev.filter(c => c.id !== clientId))
      toast.success('Cliente eliminado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  function getAccountsForPlatform(client: ClientWithAccounts, platform: PlatformType): SocialAccount[] {
    return client.social_accounts.filter(a => a.platform === platform)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-500">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} · {clients.reduce((acc, c) => acc + c.social_accounts.length, 0)} cuentas sociales
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Search + Platform filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPlatformFilter(opt.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                platformFilter === opt.value
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Cliente</TableHead>
              {PLATFORMS.map(p => {
                const cfg = PLATFORM_CONFIG[p]
                return (
                  <TableHead key={p}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white flex-shrink-0',
                        cfg.bg
                      )}>
                        {cfg.abbr}
                      </div>
                      {cfg.label}
                    </div>
                  </TableHead>
                )
              })}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-zinc-400">
                  {search || platformFilter !== 'all'
                    ? 'No hay clientes que coincidan con los filtros'
                    : 'No hay clientes aún. ¡Creá el primero!'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(client => (
              <TableRow key={client.id}>
                {/* Client name + logo */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {client.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="h-7 w-7 rounded-md object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-500">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-zinc-900">{client.name}</span>
                  </div>
                </TableCell>

                {/* Social account columns */}
                {PLATFORMS.map(platform => {
                  const accounts = getAccountsForPlatform(client, platform)
                  return (
                    <TableCell key={platform}>
                      {accounts.length === 0 ? (
                        <span className="text-zinc-300">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {accounts.map(a => (
                            <span key={a.id} className="text-sm text-zinc-700">
                              @{a.username}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  )
                })}

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                      disabled={deletingId === client.id}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="client-name">Nombre *</Label>
              <Input
                id="client-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del cliente"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="logo-url">Logo URL (opcional)</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
