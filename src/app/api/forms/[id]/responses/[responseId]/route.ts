import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function verifyFormOwnership(formId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true },
  });
  return form?.userId === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, responseId } = await params;

    const hasAccess = await verifyFormOwnership(formId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = await prisma.response.findFirst({
      where: { id: responseId, formId },
      include: {
        values: {
          include: {
            field: {
              select: { label: true, type: true, placeholder: true },
            },
          },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, responseId } = await params;

    const hasAccess = await verifyFormOwnership(formId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = await prisma.response.findFirst({
      where: { id: responseId, formId },
    });

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    await prisma.response.delete({ where: { id: responseId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}