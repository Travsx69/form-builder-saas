import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/auth/tokens';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    }

    const userId = await consumeToken(token, 'email_verification');
    if (!userId) {
      return NextResponse.json(
        { error: 'This link is invalid or has expired' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    // Idempotent: verifying an already-verified account is a success, not an
    // error, so a double-click doesn't land the user on a failure page.
    if (user && !user.emailVerified) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('verify-email error', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
