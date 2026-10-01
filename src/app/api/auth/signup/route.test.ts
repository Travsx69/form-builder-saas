import { describe, it, expect, vi, beforeEach } from 'vitest';

const userFindUnique = vi.fn();
interface CreateUserArgs {
  data: {
    name?: string;
    email: string;
    passwordHash: string;
    emailVerified?: Date;
    tokenVersion: number;
  };
}

const userCreate = vi.fn(async (args: CreateUserArgs) => {
  void args;
  return { id: 'user1', email: 'ada@example.com' };
});
const tokenCreate = vi.fn(async () => ({ id: 'tok1' }));
const tokenDeleteMany = vi.fn(async () => ({ count: 0 }));
const transaction = vi.fn(async () => []);
const sendEmail = vi.fn(async (msg: { to: string; subject: string; text: string }) => {
  void msg;
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, create: userCreate },
    authToken: { create: tokenCreate, deleteMany: tokenDeleteMany },
    $transaction: transaction,
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail,
  sendAfter: (fn: () => Promise<void>) => void fn(),
  baseUrl: () => 'http://localhost:3000',
}));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://x/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

const VALID = { name: 'Ada', email: 'ada@example.com', password: 'password1', confirmPassword: 'password1' };

describe('POST /api/auth/signup (regression + verification)', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userCreate.mockReset();
    tokenCreate.mockClear();
    sendEmail.mockClear();
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({ id: 'user1', email: 'ada@example.com' });
    sendEmail.mockResolvedValue(undefined as never);
    // Keep the anti-enumeration response floor out of the test runtime.
    process.env.AUTH_MIN_RESPONSE_MS = '0';
  });

  // The headline guarantee: signup must not confirm whether an address is
  // already registered.
  it('responds identically for an existing and a new email', async () => {
    userFindUnique.mockResolvedValueOnce({ id: 'existing' } as never);
    const existing = await POST(req(VALID));
    const existingBody = await existing.json();
    const existingStatus = existing.status;

    userFindUnique.mockResolvedValueOnce(null);
    const fresh = await POST(req(VALID));
    const freshStatus = fresh.status;
    const freshBody = await fresh.json();

    expect(existingStatus).toBe(freshStatus);
    expect(existingBody).toEqual(freshBody);
  });

  it('never states that an account already exists', async () => {
    userFindUnique.mockResolvedValue({ id: 'existing' } as never);
    const res = await POST(req(VALID));
    const text = JSON.stringify(await res.json()).toLowerCase();
    expect(text).not.toContain('already exists');
    expect(text).not.toContain('taken');
    expect(text).not.toContain('registered');
  });

  it('does not create a duplicate account', async () => {
    userFindUnique.mockResolvedValue({ id: 'existing' } as never);
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('does not send anything when the email is already registered', async () => {
    userFindUnique.mockResolvedValue({ id: 'existing' } as never);
    await POST(req(VALID));
    expect(sendEmail).not.toHaveBeenCalled();
    expect(tokenCreate).not.toHaveBeenCalled();
  });

  it('still creates a new account for an unused email', async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'If an account can be created for that email, a verification link has been sent.',
    });
    expect(userCreate).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('starts the new account at tokenVersion 0', async () => {
    await POST(req(VALID));
    expect(userCreate.mock.calls[0]![0].data.tokenVersion).toBe(0);
  });

  it('returns the generic response when a concurrent signup wins the race', async () => {
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockRejectedValueOnce({ code: 'P2002' } as never);
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'If an account can be created for that email, a verification link has been sent.',
    });
  });

  // Validation errors describe the submitted input, not account existence.
  it('still rejects a short password with 400', async () => {
    const res = await POST(req({ ...VALID, password: 'short', confirmPassword: 'short' }));
    expect(res.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('still rejects mismatched passwords with 400', async () => {
    const res = await POST(req({ ...VALID, confirmPassword: 'different1' }));
    expect(res.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('leaves emailVerified unset so the dashboard banner shows', async () => {
    await POST(req(VALID));
    expect(userCreate.mock.calls[0]![0].data.emailVerified).toBeUndefined();
    expect(tokenCreate).toHaveBeenCalledOnce();
  });

  // The difference between a user being locked out of their account and not.
  it('still returns success when the verification email fails to send', async () => {
    sendEmail.mockRejectedValueOnce(new Error('smtp down') as never);
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('never returns the verification token in the response', async () => {
    const res = await POST(req(VALID));
    expect(JSON.stringify(await res.json())).not.toMatch(/token=/);
  });
});
