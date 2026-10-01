import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();
const create = vi.fn(async () => ({ id: 'tok1' }));
const deleteMany = vi.fn(async () => ({ count: 0 }));
const transaction = vi.fn(async () => []);
const sendEmail = vi.fn(async (msg: { to: string; subject: string; text: string }) => {
  void msg;
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique },
    authToken: { create, deleteMany },
    $transaction: transaction,
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail,
  sendAfter: (fn: () => Promise<void>) => void fn(),
  baseUrl: () => 'http://localhost:3000',
}));

const { POST } = await import('./route');
const { resetRateLimits } = await import('@/lib/rate-limit');

function req(email: string, ip = '8.8.8.8') {
  return new Request('http://x/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  }) as never;
}

const UNVERIFIED = { id: 'user1', email: 'ada@example.com', emailVerified: null };
const VERIFIED = { ...UNVERIFIED, emailVerified: new Date() };

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    resetRateLimits();
    findUnique.mockReset();
    create.mockClear();
    sendEmail.mockClear();
    process.env.AUTH_MIN_RESPONSE_MS = '0';
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    findUnique.mockResolvedValue(UNVERIFIED);
  });

  it('responds identically for unverified, verified, and unknown accounts', async () => {
    findUnique.mockResolvedValueOnce(UNVERIFIED);
    const a = await POST(req('a@example.com'));
    findUnique.mockResolvedValueOnce(VERIFIED);
    const b = await POST(req('b@example.com', '9.9.9.9'));
    findUnique.mockResolvedValueOnce(null);
    const c = await POST(req('c@example.com', '10.0.0.1'));

    const [bodyA, bodyB, bodyC] = await Promise.all([a.json(), b.json(), c.json()]);
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
    expect(bodyA).toEqual(bodyB);
    expect(bodyB).toEqual(bodyC);
  });

  it('sends a fresh link to an unverified account', async () => {
    await POST(req('ada@example.com'));
    expect(create).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('sends nothing to an already-verified account but responds identically', async () => {
    findUnique.mockResolvedValueOnce(VERIFIED);
    const res = await POST(req('ada@example.com'));
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing to an unknown account', async () => {
    findUnique.mockResolvedValueOnce(null);
    const res = await POST(req('nobody@example.com'));
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with 400', async () => {
    const res = await POST(req('nope'));
    expect(res.status).toBe(400);
  });

  it('returns 429 once the limit is exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await POST(req('ada@example.com'))).status).toBe(200);
    }
    expect((await POST(req('ada@example.com'))).status).toBe(429);
  });
});
