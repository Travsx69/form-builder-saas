'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface NavigationProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

const navigationItems = [
  { href: '/dashboard/forms', label: 'Forms' },
  { href: '/dashboard/responses', label: 'Responses' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/billing', label: 'Billing' },
];

export function DashboardNavigation({ user }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800" aria-label="Main navigation">
      <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/dashboard" className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          FormFlow
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <ul className="flex flex-1 flex-col space-y-1" role="list">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              src={user?.image || null}
              fallback={user?.name || user?.email || 'U'}
              size="sm"
              alt={user?.name || 'User'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate dark:text-zinc-100">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-zinc-500 truncate dark:text-zinc-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}