import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

interface CreateArgs {
  data: { userId: string; type: string; tokenHash: string; expiresAt: Date };
}
interface UpdateManyArgs {
  where: { tokenHash: string; type: string; usedAt: null; expiresAt: { gt: Date } };
  data: { usedAt: Date };
}

// Typed so mock.calls[0][0] resolves; `void` keeps each arg "used" for lint.
const create = vi.fn(async (args: CreateArgs) => {
  void args;
  return { id: 'tok1' };
});
const deleteMany = vi.fn(async () => ({ count: 0 }));
const updateMany = vi.fn(async (args: UpdateManyArgs) => {
  void args;
  return { count: 1 };
});
const findUnique = vi.fn(async () => ({ userId: 'user1' }));
const transaction = vi.fn(async () => []);

vi.mock('@/lib/prisma', () => ({
  prisma: { authToken: { create, deleteMany, updateMany, findUnique }, $transaction: transaction },
}));

const { issueToken, consumeToken, hashToken } = await import('./tokens');

// issueToken reads the clock itself, so the observed delta can land a
// millisecond either side of the configured TTL. Allow a small window rather
// than an exact upper bound, which would flake.
function expectTtl(delta: number, expected: number) {
  expect(delta).toBeGreaterThan(expected - 1000);
  expect(delta).toBeLessThan(expected + 1000);
}

describe('issueToken', () => {
  beforeEach(() => {
    create.mockClear();
    deleteMany.mockClear();
    transaction.mockClear();
  });

  it('returns a 256-bit base64url token and stores only its hash', async () => {
    const token = await issueToken('user1', 'email_verification');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const createArgs = create.mock.calls[0]![0];
    expect(createArgs.data.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex')
    );
    // The plaintext must appear nowhere in what we persist.
    expect(JSON.stringify(createArgs)).not.toContain(token);
  });

  it('generates a different token each call', async () => {
    const a = await issueToken('user1', 'email_verification');
    const b = await issueToken('user1', 'email_verification');
    expect(a).not.toBe(b);
  });

  it('expires using the 24h verification TTL by default', async () => {
    const before = Date.now();
    await issueToken('user1', 'email_verification');
    const { expiresAt } = create.mock.calls[0]![0].data;
    expectTtl(new Date(expiresAt).getTime() - before, 24 * 60 * 60 * 1000);
  });

  it('expires using the 1h reset TTL by default', async () => {
    const before = Date.now();
    await issueToken('user1', 'password_reset');
    const { expiresAt } = create.mock.calls[0]![0].data;
    expectTtl(new Date(expiresAt).getTime() - before, 60 * 60 * 1000);
  });

  it('invalidates prior unused tokens of the same type', async () => {
    await issueToken('user1', 'password_reset');
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user1', type: 'password_reset', usedAt: null },
    });
  });

  it('deletes and creates in one transaction so a user is never left without a token', async () => {
    await issueToken('user1', 'password_reset');
    expect(transaction).toHaveBeenCalledOnce();
  });
});

describe('consumeToken', () => {
  beforeEach(() => {
    updateMany.mockClear();
    findUnique.mockClear();
    updateMany.mockResolvedValue({ count: 1 } as never);
    findUnique.mockResolvedValue({ userId: 'user1' } as never);
  });

  it('returns the userId and marks the token used on success', async () => {
    const userId = await consumeToken('abc', 'email_verification');
    expect(userId).toBe('user1');
    expect(updateMany.mock.calls[0]![0].data.usedAt).toBeInstanceOf(Date);
  });

  it('matches on the hashed token, never the plaintext', async () => {
    await consumeToken('plaintext-secret', 'email_verification');
    const where = updateMany.mock.calls[0]![0].where;
    expect(where.tokenHash).toBe(hashToken('plaintext-secret'));
    expect(JSON.stringify(where)).not.toContain('plaintext-secret');
  });

  // The test that actually pins race safety. A refactor back to
  // find-then-update would drop these guards and fail here.
  it('guards the single-use and expiry checks inside the update where clause', async () => {
    await consumeToken('abc', 'email_verification');
    const where = updateMany.mock.calls[0]![0].where;
    expect(where.usedAt).toBeNull();
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
    expect(where.type).toBe('email_verification');
  });

  it('returns null when the conditional update matches no rows', async () => {
    // Covers unknown, expired, already-used, and wrong-type tokens alike.
    updateMany.mockResolvedValue({ count: 0 } as never);
    expect(await consumeToken('abc', 'email_verification')).toBeNull();
  });

  it('lets only the first of two concurrent consumes win', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 } as never).mockResolvedValueOnce({ count: 0 } as never);
    expect(await consumeToken('abc', 'password_reset')).toBe('user1');
    expect(await consumeToken('abc', 'password_reset')).toBeNull();
  });

  it('returns null when the row vanished after the update', async () => {
    findUnique.mockResolvedValue(null as never);
    expect(await consumeToken('abc', 'password_reset')).toBeNull();
  });
});
