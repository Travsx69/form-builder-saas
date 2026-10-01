import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DashboardNavigation } from '@/components/dashboard/navigation';
import { DashboardHeader } from '@/components/dashboard/header';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Read the verification state from the DB rather than the session. JWT
  // sessions are stateless, so a session-captured value would still read
  // "unverified" right after the user clicks their link. Verification is
  // advisory: this only drives a banner, it never blocks access.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardNavigation user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        {user && !user.emailVerified && session.user.email && (
          <VerifyEmailBanner email={session.user.email} />
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}