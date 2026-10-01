import { after } from 'next/server';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface SentEmail extends EmailMessage {
  sentAt: string;
}

// ---------------------------------------------------------------------------
// Email delivery — NOT CONFIGURED FOR PRODUCTION
//
// There is no production email provider wired up. Adding one is a two-step
// change, and it requires no edits to the calling routes:
//
//   1. Set the provider's credentials in the deployment environment
//      (never in source — see .env.example for the reserved variable names).
//   2. Add a branch to `deliver()` below that constructs the provider client
//      from `process.env` and calls its send API. Install the provider's SDK
//      as a dependency at that point.
//
// Until then, in production nothing is sent: `deliver()` logs a warning and
// drops the message. Email verification and password reset therefore do not
// work in a production deployment. The development path below is complete and
// exercises the real token-issuing code.
// ---------------------------------------------------------------------------

type ProviderName = 'console' | 'unconfigured';

/**
 * Resolves the active provider from the environment.
 *
 * `EMAIL_PROVIDER` is intentionally read with no default in production: an
 * unset value in production resolves to 'unconfigured' (a loud no-op) rather
 * than silently pretending to deliver mail.
 */
function resolveProvider(): ProviderName {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (configured === 'console') return 'console';

  if (process.env.NODE_ENV === 'production') return 'unconfigured';

  return 'console';
}

// Backs the dev-only /api/dev/mail route. ponytail: per-process and capped —
// fine for local dev, and production never fills it.
const outbox: SentEmail[] = [];
const OUTBOX_MAX = 50;

export function recentMail(): SentEmail[] {
  return outbox.slice(-OUTBOX_MAX).reverse();
}

export function clearMail(): void {
  outbox.length = 0;
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/**
 * Runs the send after the response is flushed, so SMTP latency stays out of the
 * request and out of any anti-enumeration timing comparison.
 *
 * `after()` throws when called outside a Next request scope (unit tests call
 * route handlers directly), so fall back to running it inline.
 */
export function sendAfter(fn: () => Promise<void>): void {
  if (process.env.NODE_ENV === 'test') {
    void fn();
    return;
  }
  try {
    after(async () => {
      await fn();
    });
  } catch (err) {
    // No request scope (or a real misuse — log so it isn't silent).
    console.warn('[email] after() unavailable, sending inline', err);
    void fn();
  }
}

async function deliver(message: EmailMessage): Promise<void> {
  if (resolveProvider() === 'console') {
    const entry: SentEmail = { ...message, sentAt: new Date().toISOString() };
    outbox.push(entry);
    if (outbox.length > OUTBOX_MAX) outbox.shift();
    // The token lives in `text`, so this line must never run in production.
    console.log(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  // Deliberately never touches `message.text` — that is the only field carrying
  // a token, and it must not reach production logs.
  console.warn('[email] no production provider configured; message dropped', {
    to: message.to,
    subject: message.subject,
    hint: 'set EMAIL_PROVIDER and add a branch in src/lib/email/index.ts',
  });
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await deliver(message);
}
