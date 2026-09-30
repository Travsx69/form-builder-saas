'use client';

import { Suspense } from 'react';
import { SignInPageContent } from './SignInPageContent';

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignInPageContent />
    </Suspense>
  );
}