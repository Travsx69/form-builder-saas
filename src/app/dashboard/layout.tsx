import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardNavigation } from '@/components/dashboard/navigation';
import { DashboardHeader } from '@/components/dashboard/header';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardNavigation user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}