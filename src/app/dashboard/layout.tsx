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

  // Read verification state and tokenVersion from the DB. JWT sessions are
  // stateless, so session-captured values would be stale. Verification is
  // advisory (banner only), but tokenVersion is a security boundary: a
  // password reset increments it, invalidating all prior JWTs. If the version
  // no longer matches, the session is dead — redirect to sign-in so a fresh
  // JWT is minted on next login.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, tokenVersion: true },
  });

  if (!user || user.tokenVersion !== (session.user.tokenVersion ?? 0)) {
    redirect('/auth/signin');
  }

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