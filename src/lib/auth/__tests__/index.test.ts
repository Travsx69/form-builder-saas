import { describe, it, expect, vi, beforeEach } from 'vitest';

type AuthConfig = {
  callbacks: {
    jwt: (params: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    session: (params: Record<string, unknown>) => Promise<{ user: Record<string, unknown> }>;
  };
  providers: {
    authorize: (credentials: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  }[];
};

const { configRef, userFind, bcryptCompare } = vi.hoisted(() => ({
  configRef: { current: null as AuthConfig | null },
  userFind: vi.fn(async () => ({ tokenVersion: 0 })),
  bcryptCompare: vi.fn(async () => true),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFind },
    // PrismaAdapter is stubbed below, but the module still needs the shape.
    account: {},
    session: {},
  },
}));

vi.mock('next-auth', () => ({
  default: (cfg: AuthConfig) => {
    configRef.current = cfg;
    return { handlers: {}, signIn: {}, signOut: {}, auth: () => ({}) };
  },
}));

vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));

vi.mock('next-auth/providers/credentials', () => ({
  default: (opts: unknown) => opts,
}));

vi.mock('bcryptjs', () => ({
  default: { compare: bcryptCompare, hash: vi.fn(async () => 'h') },
}));

await import('@/lib/auth');

const config = configRef.current as AuthConfig;
const jwtCallback = config.callbacks.jwt;
const sessionCallback = config.callbacks.session;
const authorize = config.providers[0].authorize;

describe('auth jwt callback', () => {
  beforeEach(() => {
    userFind.mockResolvedValue({ tokenVersion: 0 } as never);
  });

  it('stamps the token with the user id and current version at sign-in', async () => {
    const token = await jwtCallback({
      token: {},
      user: { id: 'user1', tokenVersion: 3 },
    } as never);
    expect(token).toMatchObject({ id: 'user1', tokenVersion: 3 });
  });

  it('keeps a session alive while the version still matches', async () => {
    userFind.mockResolvedValue({ tokenVersion: 3 } as never);
    const token = await jwtCallback({ token: { id: 'user1', tokenVersion: 3 } } as never);
    expect(token).not.toBeNull();
  });

  // The fix for the audit finding: a bumped version invalidates every JWT
  // already issued, because Auth.js treats a null token as a dead session.
  it('returns null when the version no longer matches (password was reset)', async () => {
    userFind.mockResolvedValue({ tokenVersion: 1 } as never);
    const token = await jwtCallback({ token: { id: 'user1', tokenVersion: 0 } } as never);
    expect(token).toBeNull();
  });

  it('returns null when the user no longer exists', async () => {
    userFind.mockResolvedValue(null as never);
    const token = await jwtCallback({ token: { id: 'ghost', tokenVersion: 0 } } as never);
    expect(token).toBeNull();
  });

  // Regression guard: sessions issued before this feature existed have no
  // tokenVersion claim. They must keep working against the default of 0.
  it('keeps pre-existing sessions without a version claim valid', async () => {
    userFind.mockResolvedValue({ tokenVersion: 0 } as never);
    const token = await jwtCallback({ token: { id: 'user1' } } as never);
    expect(token).not.toBeNull();
  });
});

describe('auth session callback', () => {
  it('exposes the user id and version', async () => {
    const result = await sessionCallback({
      session: { user: {} },
      token: { id: 'user1', tokenVersion: 2 },
    } as never);
    expect(result.user).toMatchObject({ id: 'user1', tokenVersion: 2 });
  });
});

describe('credentials authorize', () => {
  beforeEach(() => {
    userFind.mockReset();
  });

  it('returns the user id and current tokenVersion', async () => {
    userFind.mockResolvedValue({
      id: 'user1',
      email: 'ada@example.com',
      name: 'Ada',
      image: null,
      passwordHash: 'hash',
      tokenVersion: 4,
    } as never);

    const user = await authorize({
      email: 'ada@example.com',
      password: 'password1',
    });
    expect(user).toMatchObject({ id: 'user1', tokenVersion: 4 });
  });

  it('still rejects a bad password', async () => {
    bcryptCompare.mockResolvedValueOnce(false as never);
    userFind.mockResolvedValue({
      id: 'user1',
      email: 'ada@example.com',
      passwordHash: 'hash',
      tokenVersion: 0,
    } as never);

    expect(
      await authorize({ email: 'ada@example.com', password: 'wrongpassword' })
    ).toBeNull();
  });

  it('still rejects an unknown email', async () => {
    userFind.mockResolvedValue(null as never);
    expect(
      await authorize({ email: 'nobody@example.com', password: 'password1' })
    ).toBeNull();
  });
});
