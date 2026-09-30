import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCsv } from '@/lib/forms/csv';

async function verifyFormOwnership(formId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true },
  });
  return form?.userId === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId } = await params;

    const hasAccess = await verifyFormOwnership(formId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        name: true,
        fields: {
          select: { id: true, label: true, type: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const responses = await prisma.response.findMany({
      where: { formId },
      orderBy: { submittedAt: 'desc' },
      include: {
        values: {
          select: { fieldId: true, value: true },
        },
      },
    });

    const csv = generateCsv(form, responses);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${form.name.replace(/[^a-z0-9]/gi, '_')}_responses_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}