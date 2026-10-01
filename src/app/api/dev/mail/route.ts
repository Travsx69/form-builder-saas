import { NextResponse } from 'next/server';
import { clearMail, recentMail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Development-only view of recent messages so verification/reset links are
// clickable without an email provider. 404 (not 403) in production so the route
// doesn't even confirm it exists.
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export async function GET() {
  if (isProduction()) return new NextResponse(null, { status: 404 });
  return NextResponse.json(recentMail());
}

export async function DELETE() {
  if (isProduction()) return new NextResponse(null, { status: 404 });
  clearMail();
  return NextResponse.json({ ok: true });
}
