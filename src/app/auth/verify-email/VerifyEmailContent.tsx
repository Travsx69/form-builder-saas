'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailContent() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [result, setResult] = useState<{ status: Status; message: string } | null>(null);

  // The token is single-use. React 19 StrictMode double-invokes effects in dev,
  // which would spend it on the first call and then show a false "invalid or
  // expired" on a perfectly good verification. Guard with a ref.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          // The dashboard banner is rendered from the DB in a server component,
          // so a soft navigation would leave it stale. Refresh to clear it.
          router.refresh();
          setResult({ status: 'success', message: '' });
        } else {
          setResult({
            status: 'error',
            message: data.error || 'This link is invalid or has expired.',
          });
        }
      } catch {
        setResult({ status: 'error', message: 'Something went wrong. Please try again.' });
      }
    })();
  }, [token, router]);

  // A missing token is derived, not stored — no effect needs to set it.
  const status: Status = !token ? 'error' : (result?.status ?? 'verifying');
  const message = !token
    ? 'This verification link is missing its token.'
    : (result?.message ?? '');

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            FormFlow
          </Link>
          <CardTitle>
            {status === 'success' && 'Email verified'}
            {status === 'error' && 'Verification failed'}
            {status === 'verifying' && 'Verifying your email'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'One moment...'}
            {status === 'success' && 'Your email address is confirmed.'}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'verifying' && (
            <div className="flex justify-center py-6">
              <svg className="h-8 w-8 animate-spin text-zinc-400" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {status === 'success' && (
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          )}

          {status === 'error' && (
            <>
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400" role="alert">
                {message}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signin">Back to sign in</Link>
              </Button>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                You can request a new link from the dashboard banner.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
