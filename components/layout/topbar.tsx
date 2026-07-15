// components/layout/topbar.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, UserIcon } from 'lucide-react'
import type { User, Company } from '@/lib/types'

interface TopbarProps {
  user: (User & { company: Company | null }) | null
}

function getInitials(user: User | null): string {
  if (!user) return '??'
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.email.slice(0, 2).toUpperCase()
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <p className="text-sm font-medium text-zinc-400">
        {user?.company?.name ?? 'Mi agencia'}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 px-2 py-1.5 h-auto hover:bg-zinc-50"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-medium leading-tight text-zinc-900">
                {user?.full_name ?? user?.email}
              </p>
              <p className="text-xs capitalize leading-tight text-zinc-400">{user?.role}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-normal text-xs text-zinc-400">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <UserIcon className="mr-2 h-4 w-4" />
            Configuración
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
