'use client';

import { Suspense } from 'react';
import { ResetPasswordContent } from './ResetPasswordContent';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
