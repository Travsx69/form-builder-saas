import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export type AuthTokenType = 'email_verification' | 'password_reset';

const DEFAULT_TTL_MS: Record<AuthTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, // 1h — reset grants account takeover
};

function ttlMs(type: AuthTokenType): number {
  const env =
    type === 'email_verification'
      ? process.env.EMAIL_VERIFICATION_TOKEN_TTL_MS
      : process.env.PASSWORD_RESET_TOKEN_TTL_MS;
  return Number(env ?? DEFAULT_TTL_MS[type]);
}

/**
 * SHA-256, deliberately not bcrypt: the token is 32 bytes of CSPRNG output, so
 * there is no low-entropy secret to brute-force and a work factor would only
 * add 100-300ms of CPU per email click (a DoS lever). SHA-256 also gives a
 * deterministic `WHERE token_hash = $1`, which is what lets consumeToken be
 * atomic.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// base64url so the token survives a query string unescaped.
function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Issues a token and returns the plaintext exactly once. Only the hash is
 * stored, so the plaintext is unrecoverable from the database.
 *
 * Prior unused tokens of the same type are deleted in the same transaction, so
 * re-issuing invalidates the previously sent link and never leaves the user
 * with zero valid tokens.
 */
export async function issueToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlMs(type));

  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  return token;
}

/**
 * Atomically consumes a token, returning the owning userId or null when the
 * token is unknown, the wrong type, expired, or already used.
 *
 * Race safety: the `usedAt: null` and expiry guards live INSIDE the
 * updateMany's WHERE clause, so check-and-set is a single SQL statement. Under
 * concurrency Postgres serializes on the row lock and the loser's UPDATE
 * re-evaluates the predicate against the new row version, matches zero rows,
 * and returns count 0. A read-then-write would let both callers win.
 */
export async function consumeToken(token: string, type: AuthTokenType): Promise<string | null> {
  const now = new Date();
  const tokenHash = hashToken(token);

  const { count } = await prisma.authToken.updateMany({
    where: {
      tokenHash,
      type,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (count !== 1) return null;

  // Readable only because we just won the compare-and-set above.
  const row = await prisma.authToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  return row?.userId ?? null;
}

/** Housekeeping. ponytail: not scheduled yet — wire to cron once the table grows. */
export async function purgeExpiredTokens(): Promise<number> {
  const { count } = await prisma.authToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
