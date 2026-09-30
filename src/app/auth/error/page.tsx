'use client';

import { Suspense } from 'react';
import { AuthErrorPageContent } from './AuthErrorPageContent';

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AuthErrorPageContent />
    </Suspense>
  );
}