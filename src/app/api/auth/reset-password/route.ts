import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/auth/tokens';

// Mirrors the signup schema's password rules exactly (min 8, must match, no max)
// so both entry points enforce the same policy.
// ponytail: no max length — bcrypt silently ignores bytes past 72, so a longer
// password is no stronger than its first 72 chars. Add .max(72) when password
// policy is next revisited.
const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Consumes the token atomically, so a replayed or concurrent submit fails.
    const userId = await consumeToken(token, 'password_reset');
    if (!userId) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Incrementing tokenVersion invalidates every JWT this user already holds:
    // the auth jwt callback compares the token's version to the current one and
    // returns null (signing the user out) when they differ. Their next sign-in
    // mints a fresh JWT carrying the new version, so normal login keeps working.
    // Deliberately NOT calling prisma.session.deleteMany: under the jwt strategy
    // that table is never written, so it would silently do nothing while looking
    // like a safeguard.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      // Scope to password_reset only: an unrelated outstanding email-verification
      // link is not affected by a password change and should stay usable.
      prisma.authToken.deleteMany({
        where: { userId, type: 'password_reset', usedAt: null },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('reset-password error', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
