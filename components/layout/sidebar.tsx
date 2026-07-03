// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { SocialAccountWithClient } from '@/lib/types'
import {
  LayoutDashboard,
  Calendar,
  BarChart2,
  Settings,
  Users,
  Building2,
  AtSign,
  PenSquare,
} from 'lucide-react'

interface SidebarProps {
  accounts: SocialAccountWithClient[]
  userRole: string
  companyName: string
}

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'IG' },
  facebook:  { bg: 'bg-blue-600',  label: 'FB' },
  tiktok:    { bg: 'bg-zinc-900',  label: 'TK' },
}

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
  exact = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  pathname: string
  exact?: boolean
}) {
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-zinc-100 text-zinc-900 font-medium'
          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  )
}

export function Sidebar({ accounts, userRole, companyName }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
          OM
        </div>
        <span className="truncate text-base font-bold text-zinc-900">{companyName}</span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        {/* Selector de perfiles */}
        {accounts.length > 0 && (
          <div className="px-3 mb-2">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Perfiles
            </p>
            <div className="space-y-0.5">
              {accounts.map((account) => {
                const style = PLATFORM_STYLES[account.platform] ?? { bg: 'bg-zinc-400', label: '?' }
                const isActive = pathname === `/feed/${account.id}`
                return (
                  <Link
                    key={account.id}
                    href={`/feed/${account.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white',
                        style.bg
                      )}
                    >
                      {style.label}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">
                        {account.client?.name ?? 'Cliente'}
                      </p>
                      <p className="truncate text-xs text-zinc-400">@{account.username}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="mx-3 my-2 border-t border-zinc-100" />

        {/* Navegación principal */}
        <nav className="space-y-0.5 px-3">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" pathname={pathname} exact />
          <NavItem href="/compose" icon={PenSquare} label="Nuevo Post" pathname={pathname} />
          <NavItem href="/calendar" icon={Calendar} label="Calendario" pathname={pathname} />
          <NavItem href="/analytics" icon={BarChart2} label="Analytics" pathname={pathname} />
        </nav>

        {/* Sección Admin */}
        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-zinc-100" />
            <div className="px-3">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Admin
              </p>
              <nav className="space-y-0.5">
                <NavItem href="/admin/users" icon={Users} label="Usuarios" pathname={pathname} />
                <NavItem href="/admin/clients" icon={Building2} label="Clientes" pathname={pathname} />
                <NavItem href="/admin/accounts" icon={AtSign} label="Cuentas" pathname={pathname} />
              </nav>
            </div>
          </>
        )}

        {/* Parte inferior */}
        <div className="mt-auto px-3">
          <div className="mb-2 border-t border-zinc-100" />
          <NavItem href="/settings" icon={Settings} label="Configuración" pathname={pathname} />
        </div>
      </div>
    </aside>
  )
}
