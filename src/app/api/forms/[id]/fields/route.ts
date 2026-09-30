import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createFieldSchema, validateFieldOptions } from '@/lib/forms/validation';
import type { FieldType } from '@/lib/forms/types';

async function verifyFormOwnership(formId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true },
  });
  return form?.userId === userId;
}

export async function POST(
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

    const body = await request.json();
    const parsed = createFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, label, description, required, options, validation } = parsed.data;

    const optionsError = validateFieldOptions(type as FieldType, options);
    if (optionsError) {
      return NextResponse.json({ error: optionsError }, { status: 400 });
    }

    const maxOrder = await prisma.formField.aggregate({
      where: { formId },
      _max: { order: true },
    });

    const field = await prisma.formField.create({
      data: {
        type,
        label,
        placeholder: description,
        required: required ?? false,
        options: options as string[],
        validation: validation as object,
        order: (maxOrder._max.order ?? -1) + 1,
        formId,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}