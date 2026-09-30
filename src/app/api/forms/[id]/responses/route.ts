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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where: { formId },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: {
          values: {
            include: {
              field: {
                select: { label: true, type: true },
              },
            },
          },
        },
      }),
      prisma.response.count({ where: { formId } }),
    ]);

    return NextResponse.json({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}