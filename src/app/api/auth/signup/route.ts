import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueToken } from '@/lib/auth/tokens';
import { baseUrl, sendAfter, sendEmail } from '@/lib/email';
import { paddedResponse } from '@/lib/auth/generic-response';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Deliberately identical for an existing and a non-existing address. The client
// is redirected to sign-in either way, which is the standard trade-off for not
// confirming whether an address is registered.
const GENERIC_SIGNUP_RESPONSE = {
  success: true,
  message: 'If an account can be created for that email, a verification link has been sent.',
};

// Prisma error code for a unique-constraint violation.
const UNIQUE_VIOLATION = 'P2002';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    // Validation failures describe the submitted input, not account existence,
    // so a 400 here is safe.
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    // Already registered: create nothing, send nothing, and fall through to the
    // same generic response a new account would get.
    if (existingUser) {
      return await paddedResponse(GENERIC_SIGNUP_RESPONSE, startedAt);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // emailVerified is intentionally left null: the new account starts unverified
    // and the dashboard shows a banner. Verification is advisory — it does not
    // gate access, so no existing account is affected.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        tokenVersion: 0,
      },
    });

    // Advisory only: a failure here must never fail signup. The user can always
    // request a new link from the dashboard banner.
    try {
      const token = await issueToken(user.id, 'email_verification');
      const url = `${baseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
      sendAfter(() =>
        sendEmail({
          to: user.email,
          subject: 'Verify your FormFlow email',
          text: `Welcome to FormFlow. Verify your email: ${url}\n\nThis link expires in 24 hours.`,
        })
      );
    } catch (err) {
      console.error('verification email failed', err);
    }

    return await paddedResponse(GENERIC_SIGNUP_RESPONSE, startedAt);
  } catch (err) {
    // A concurrent signup for the same address lands here. That must not read as
    // a 500, which would distinguish it from the success path.
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === UNIQUE_VIOLATION
    ) {
      return await paddedResponse(GENERIC_SIGNUP_RESPONSE, startedAt);
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}