import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { issueToken } from '@/lib/auth/tokens';
import { baseUrl, sendAfter, sendEmail } from '@/lib/email';
import { checkEmailRateLimit, genericEmailResponse } from '@/lib/auth/generic-response';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      // A format error says nothing about whether the account exists.
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    // Rate limit before the user lookup — a 429 keyed on data we already have
    // cannot reveal account existence.
    const { allowed, retryAfter } = checkEmailRateLimit(request, email, 'forgot');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = await issueToken(user.id, 'password_reset');
      const url = `${baseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
      // Off the response path so SMTP variance stays out of the timing.
      sendAfter(() =>
        sendEmail({
          to: user.email,
          subject: 'Reset your FormFlow password',
          text: `Reset your password: ${url}\n\nThis link expires in 1 hour and can be used once.\nIf you didn't request this, you can ignore this email.`,
        })
      );
    }

    return await genericEmailResponse(startedAt);
  } catch (err) {
    // Never 500 here: a 500 would only fire on the account-exists path, which
    // is itself an enumeration oracle. Log server-side, respond generically.
    console.error('forgot-password error', err);
    return await genericEmailResponse(startedAt);
  }
}
