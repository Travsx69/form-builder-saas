import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateMany = vi.fn(async () => ({ count: 1 }));
const tokenFindUnique = vi.fn(async () => ({ userId: 'user1' }));
const userFindUnique = vi.fn(async () => ({ emailVerified: null }));
const userUpdate = vi.fn(async (args: { where: { id: string }; data: { emailVerified: Date } }) => {
  void args;
  return {};
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    authToken: { updateMany, findUnique: tokenFindUnique },
    user: { findUnique: userFindUnique, update: userUpdate },
  },
}));

const { GET } = await import('./route');

function req(token?: string) {
  const url = token ? `http://x/api/auth/verify-email?token=${token}` : 'http://x/api/auth/verify-email';
  // The handler reads request.nextUrl, which only NextRequest has; a plain
  // Request needs it attached.
  const request = new Request(url);
  return Object.assign(request, { nextUrl: new URL(url) }) as never;
}

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    updateMany.mockClear();
    userUpdate.mockClear();
    updateMany.mockResolvedValue({ count: 1 } as never);
    tokenFindUnique.mockResolvedValue({ userId: 'user1' } as never);
    userFindUnique.mockResolvedValue({ emailVerified: null } as never);
  });

  it('verifies a valid token and stamps emailVerified', async () => {
    const res = await GET(req('good-token'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(userUpdate).toHaveBeenCalledOnce();
    expect(userUpdate.mock.calls[0]![0].data.emailVerified).toBeInstanceOf(Date);
  });

  it('handles an already-verified account gracefully', async () => {
    userFindUnique.mockResolvedValue({ emailVerified: new Date() } as never);
    const res = await GET(req('good-token'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // No redundant write.
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects an expired or already-used token', async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);
    const res = await GET(req('stale-token'));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a missing token', async () => {
    const res = await GET(req());
    expect(res.status).toBe(400);
  });

  it('never echoes the token back in the response', async () => {
    const res = await GET(req('super-secret-token'));
    expect(JSON.stringify(await res.json())).not.toContain('super-secret-token');
  });
});
