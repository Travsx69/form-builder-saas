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
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const { allowed, retryAfter } = checkEmailRateLimit(request, email, 'resend');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Already-verified users get no mail, but the same response — the branch
    // must not be observable.
    if (user && !user.emailVerified) {
      const token = await issueToken(user.id, 'email_verification');
      const url = `${baseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
      sendAfter(() =>
        sendEmail({
          to: user.email,
          subject: 'Verify your FormFlow email',
          text: `Verify your email: ${url}\n\nThis link expires in 24 hours.\nIf you didn't sign up for FormFlow, you can ignore this email.`,
        })
      );
    }

    return await genericEmailResponse(startedAt);
  } catch (err) {
    console.error('resend-verification error', err);
    return await genericEmailResponse(startedAt);
  }
}
