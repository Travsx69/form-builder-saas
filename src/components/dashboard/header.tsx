'use client';

import { useSession, signOut } from 'next-auth/react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="flex flex-1 items-center gap-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">FormFlow</h1>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
              <Avatar
                src={session?.user?.image || null}
                fallback={session?.user?.name || session?.user?.email || 'U'}
                size="sm"
                alt={session?.user?.name || 'User'}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {}}>
              <Link href="/dashboard/settings" className="block w-full">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>
              <Link href="/dashboard/billing" className="block w-full">
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}