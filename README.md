# FormFlow

A form builder SaaS built with Next.js 16 (App Router), TypeScript, Prisma/PostgreSQL,
and NextAuth v5.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run dev
```

Useful scripts: `npm run dev`, `npm run build`, `npm run test`, `npm run lint`,
`npm run db:migrate`, `npm run db:studio`.

---

## Deployment notes

### Rate limiting is per-process and in-memory

`src/lib/rate-limit.ts` keeps its counters in a plain `Map` inside the Node
process. This means:

- **Counters reset on every deploy or restart.**
- **Counters are not shared between instances.** Running N instances makes the
  effective limit N times the configured one.
- There is no external dependency, no Redis, and no network call in the request
  path.

This is **acceptable for the current MVP**, which targets a single instance. It
was chosen deliberately over adding a shared store to keep the MVP dependency
surface small and the request path free of network calls.

**If you scale to more than one instance, the configured limits stop being real
limits** and this must be replaced with shared storage. The drop-in replacement
is Redis or Upstash:

1. Replace the `Map` in `src/lib/rate-limit.ts` with a shared counter
   (Upstash's `@upstash/redis` + `@upstash/ratelimit` is the smallest option).
2. Keep the exported `checkRateLimit` / `clientIp` / `resetRateLimits` signatures
   unchanged, or update the four call sites in one commit:
   - `src/app/api/forms/public/[slug]/submit/route.ts`
   - `src/app/api/auth/forgot-password/route.ts`
   - `src/app/api/auth/resend-verification/route.ts`
3. `resetRateLimits()` exists for tests only and can be dropped once the
   implementation is shared.

The `ponytail:` comment at the top of the file records the same trade-off.

Limits currently in use:

| Scope | Env vars | Default |
|---|---|---|
| Public form submission | `SUBMIT_RATE_LIMIT_MAX` / `SUBMIT_RATE_LIMIT_WINDOW_MS` | 10 / 60s, per IP per form |
| Forgot password & resend | `AUTH_RATE_LIMIT_MAX` / `AUTH_IP_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` | 3 per email, 20 per IP, 15 min |

### Email delivery is not configured for production

There is no production email provider. `src/lib/email/index.ts` resolves a
provider from `EMAIL_PROVIDER`:

- **Development** (`EMAIL_PROVIDER` unset or `console`): messages are printed to
  the server console and buffered in memory, viewable at the dev-only
  `GET /api/dev/mail` route. That route returns 404 in production.
- **Production** with `EMAIL_PROVIDER` unset: messages are **dropped** with a
  warning. Password reset and email verification therefore **do not work in a
  production deployment** until a provider is added.

To add one, see the header comment in `src/lib/email/index.ts`. Credentials come
from environment variables; no key is stored in source.

### Auth

- Passwords are bcrypt-hashed at cost 12; minimum length 8.
- Verification and reset tokens are 256-bit CSPRNG values, stored only as
  SHA-256 hashes, expire (24h / 1h), and are single-use via an atomic
  compare-and-set. See `src/lib/auth/tokens.ts`.
- A password reset increments `User.tokenVersion`, which invalidates every JWT
  previously issued for that user. The cost is one primary-key lookup per
  `auth()` call.
- **Email verification is advisory.** It sets `User.emailVerified` and shows a
  dashboard banner, but does not gate dashboard access. This is deliberate so no
  existing account can be locked out; see `src/middleware.ts` and
  `src/app/dashboard/layout.tsx`.
- Signup, forgot-password, and resend-verification return identical responses
  regardless of whether an account exists.
