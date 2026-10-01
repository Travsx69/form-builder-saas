import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

/**
 * The single response every non-enumerating endpoint returns, whether or not
 * the account exists. Both endpoints below must return this byte-identically —
 * a different status, body, or error path is an account-existence oracle.
 */
export const GENERIC_EMAIL_RESPONSE = {
  success: true,
  message: 'If an account exists for that email, a link has been sent.',
};

const RATE_WINDOW_MS = () => Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 900_000);

/**
 * Pads the response out to a fixed floor. Without this, the account-exists path
 * (a user lookup plus a token write) is measurably slower than the missing path
 * (a lookup alone), which is a timing side channel even when the body is right.
 */
export async function genericEmailResponse(startedAt: number): Promise<NextResponse> {
  return paddedResponse(GENERIC_EMAIL_RESPONSE, startedAt);
}

/**
 * Same floor, for any body. Shared so the delay can't drift between callers.
 */
export async function paddedResponse(
  body: unknown,
  startedAt: number
): Promise<NextResponse> {
  const floor = Number(process.env.AUTH_MIN_RESPONSE_MS ?? 400);
  const wait = floor - (Date.now() - startedAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return NextResponse.json(body);
}

/**
 * Two independent limits, checked BEFORE any user lookup so that neither can
 * reveal whether the account exists:
 *
 *  - per email (tight): stops an attacker spamming one victim's inbox
 *  - per IP (loose): stops mass enumeration, set high so that a corporate or
 *    university NAT putting many users behind one address doesn't notice
 */
export function checkEmailRateLimit(
  request: Request,
  email: string,
  scope: string
): { allowed: boolean; retryAfter: number } {
  const windowMs = RATE_WINDOW_MS();

  const byEmail = checkRateLimit(`${scope}:email:${email}`, {
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 3),
    windowMs,
  });
  if (!byEmail.allowed) return byEmail;

  return checkRateLimit(`${scope}:ip:${clientIp(request)}`, {
    max: Number(process.env.AUTH_IP_RATE_LIMIT_MAX ?? 20),
    windowMs,
  });
}
