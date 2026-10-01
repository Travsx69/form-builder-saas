'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function VerifyEmailBanner({ email }: { email: string }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // The endpoint never reveals whether the account exists, so this message
      // is accurate either way.
      toast.success('If an account exists for that email, a verification link has been sent.');
      if (res.ok) router.refresh();
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        Verify your email address to secure your account. You can keep using FormFlow in the
        meantime.
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isSending}
        isLoading={isSending}
        className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        Resend email
      </Button>
    </div>
  );
}
