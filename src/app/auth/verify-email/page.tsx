'use client';

import { Suspense } from 'react';
import { VerifyEmailContent } from './VerifyEmailContent';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
