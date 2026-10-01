import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Auth pages a signed-in user must still be able to reach. Each either carries
// a single-use token in its query string or is a token-entry form.
// ponytail: keep this list to exactly what needs it — adding a prefix here
// would defeat the redirect below entirely.
const AUTH_ALLOWLIST = new Set([
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/forgot-password',
]);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isOnDashboard = pathname.startsWith('/dashboard');
  const isOnAuth = pathname.startsWith('/auth');

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', req.nextUrl));
  }

  // Allowlisted paths never reach this redirect, which is what preserves their
  // query string — the redirect below builds a bare URL and drops ?token=.
  if (isOnAuth && isLoggedIn && !AUTH_ALLOWLIST.has(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
