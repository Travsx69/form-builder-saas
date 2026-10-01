import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();
const create = vi.fn(async () => ({ id: 'tok1' }));
const deleteMany = vi.fn(async () => ({ count: 0 }));
const transaction = vi.fn(async () => []);
interface MailArg {
  to: string;
  subject: string;
  text: string;
}

// Typed so mock.calls[0][0] resolves; `void` keeps the arg "used" for lint.
const sendEmail = vi.fn(async (msg: MailArg) => {
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
  // Run inline so the send is observable in the test.
  sendAfter: (fn: () => Promise<void>) => void fn(),
  baseUrl: () => 'http://localhost:3000',
}));

const { POST } = await import('./route');
const { resetRateLimits } = await import('@/lib/rate-limit');

function req(email: string, ip = '5.5.5.5') {
  return new Request('http://x/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  }) as never;
}

const EXISTING = { id: 'user1', email: 'ada@example.com', emailVerified: null };

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    resetRateLimits();
    findUnique.mockReset();
    create.mockClear();
    sendEmail.mockClear();
    process.env.AUTH_MIN_RESPONSE_MS = '0'; // keep tests fast
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    findUnique.mockResolvedValue(EXISTING);
  });

  // The headline guarantee: an attacker must not be able to tell whether an
  // email is registered, by status, by body, or by timing.
  it('responds identically whether or not the account exists', async () => {
    findUnique.mockResolvedValueOnce(EXISTING);
    const withAccount = await POST(req('ada@example.com'));
    const bodyA = await withAccount.json();
    const statusA = withAccount.status;

    findUnique.mockResolvedValueOnce(null);
    const withoutAccount = await POST(req('nobody@example.com', '6.6.6.6'));
    const bodyB = await withoutAccount.json();
    const statusB = withoutAccount.status;

    expect(statusA).toBe(statusB);
    expect(bodyA).toEqual(bodyB);
  });

  it('never mentions whether an account exists in the body', async () => {
    findUnique.mockResolvedValueOnce(null);
    const res = await POST(req('nobody@example.com'));
    const text = JSON.stringify(await res.json()).toLowerCase();
    expect(text).not.toContain('not found');
    expect(text).not.toContain('no account');
    expect(text).not.toContain('does not exist');
  });

  it('issues a token and sends mail when the account exists', async () => {
    await POST(req('ada@example.com'));
    expect(create).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0]![0].to).toBe('ada@example.com');
  });

  it('does no token or mail work when the account is absent', async () => {
    findUnique.mockResolvedValueOnce(null);
    await POST(req('nobody@example.com'));
    expect(create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never leaks the token in the response body', async () => {
    await POST(req('ada@example.com'));
    const sent = sendEmail.mock.calls[0]![0].text;
    const token = sent.match(/token=([A-Za-z0-9_-]+)/)![1];
    const res = await POST(req('ada@example.com', '7.7.7.7'));
    expect(JSON.stringify(await res.json())).not.toContain(token);
  });

  it('rejects a malformed email with 400', async () => {
    const res = await POST(req('not-an-email'));
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After once the per-email limit is exceeded', async () => {
    // Per-email max is 3: the first three succeed, the fourth is limited.
    for (let i = 0; i < 3; i++) {
      const ok = await POST(req('ada@example.com'));
      expect(ok.status).toBe(200);
    }
    const limited = await POST(req('ada@example.com'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it('rate limits unknown addresses identically', async () => {
    findUnique.mockResolvedValue(null);
    for (let i = 0; i < 3; i++) {
      const ok = await POST(req('nobody@example.com'));
      expect(ok.status).toBe(200);
    }
    // 429 depends only on request rate, never on account existence.
    const limited = await POST(req('nobody@example.com'));
    expect(limited.status).toBe(429);
  });
});
