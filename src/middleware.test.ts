import { describe, it, expect, vi } from 'vitest';

// Identity wrapper so we can call the middleware with a synthetic request.
vi.mock('@/lib/auth', () => ({
  auth: (fn: (req: unknown) => unknown) => fn,
}));

const middleware = (await import('./middleware')).default;

function run(path: string, isLoggedIn: boolean) {
  const req = {
    auth: isLoggedIn ? { user: { id: 'user1' } } : undefined,
    nextUrl: new URL(path, 'http://localhost:3000'),
  };
  return middleware(req as never, {} as never) as Response;
}

describe('Middleware', () => {
  // Regression tests for the bug that broke password reset and email
  // verification: every /auth/* path used to redirect signed-in users to
  // /dashboard, discarding the ?token= query string in the process.
  it('lets a signed-in user reach reset-password with the token intact', () => {
    const res = run('/auth/reset-password?token=abc123', true);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets a signed-in user reach verify-email', () => {
    expect(run('/auth/verify-email?token=abc123', true).status).toBe(200);
  });

  it('lets a signed-in user reach forgot-password', () => {
    expect(run('/auth/forgot-password', true).status).toBe(200);
  });

  it('still bounces a signed-in user away from signin', () => {
    const res = run('/auth/signin', true);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('still bounces a signed-in user away from signup', () => {
    expect(run('/auth/signup', true).status).toBe(307);
  });

  it('redirects a signed-out user from the dashboard to signin', () => {
    const res = run('/dashboard/forms', false);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/signin');
  });

  it('lets a signed-out user reach forgot-password', () => {
    expect(run('/auth/forgot-password', false).status).toBe(200);
  });
});
