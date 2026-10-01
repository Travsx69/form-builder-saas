import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateMany = vi.fn(async () => ({ count: 1 }));
const tokenFindUnique = vi.fn(async () => ({ userId: 'user1' }));
const userUpdate = vi.fn(async (args: { where: { id: string }; data: { passwordHash: string; tokenVersion: { increment: number } } }) => {
  void args;
  return {};
});
const tokenDeleteMany = vi.fn(async () => ({ count: 0 }));
const transaction = vi.fn(async () => []);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    authToken: { updateMany, findUnique: tokenFindUnique, deleteMany: tokenDeleteMany },
    user: { update: userUpdate },
    $transaction: transaction,
  },
}));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://x/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    updateMany.mockClear();
    userUpdate.mockClear();
    tokenDeleteMany.mockClear();
    transaction.mockClear();
    updateMany.mockResolvedValue({ count: 1 } as never);
    tokenFindUnique.mockResolvedValue({ userId: 'user1' } as never);
  });

  it('resets the password with a cost-12 bcrypt hash', async () => {
    const res = await POST(req({ token: 't', password: 'newpassword', confirmPassword: 'newpassword' }));
    expect(res.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledOnce();
    const { passwordHash } = userUpdate.mock.calls[0]![0].data;
    // Cost factor is a security property, not an incidental detail.
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('never stores or echoes the plaintext password', async () => {
    await POST(req({ token: 't', password: 'supersecret1', confirmPassword: 'supersecret1' }));
    expect(JSON.stringify(userUpdate.mock.calls[0]![0].data)).not.toContain('supersecret1');
  });

  it('rejects an invalid, expired, or already-used token', async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST(req({ token: 'bad', password: 'newpassword', confirmPassword: 'newpassword' }));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('enforces the existing minimum password length', async () => {
    const res = await POST(req({ token: 't', password: 'short', confirmPassword: 'short' }));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    const res = await POST(req({ token: 't', password: 'newpassword', confirmPassword: 'different1' }));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('increments tokenVersion so previously issued JWTs stop validating', async () => {
    await POST(req({ token: 't', password: 'newpassword', confirmPassword: 'newpassword' }));
    expect(userUpdate.mock.calls[0]![0].data.tokenVersion).toEqual({ increment: 1 });
  });

  it('invalidates only password-reset tokens, leaving verification links usable', async () => {
    await POST(req({ token: 't', password: 'newpassword', confirmPassword: 'newpassword' }));
    expect(tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user1', type: 'password_reset', usedAt: null },
    });
  });

  it('writes the password, version bump, and token cleanup in one transaction', async () => {
    await POST(req({ token: 't', password: 'newpassword', confirmPassword: 'newpassword' }));
    expect(transaction).toHaveBeenCalledOnce();
  });
});
