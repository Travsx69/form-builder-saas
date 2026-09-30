import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateFieldSchema, validateFieldOptions } from '@/lib/forms/validation';
import { FieldType } from '@/lib/forms/types';

async function verifyFieldOwnership(formId: string, fieldId: string, userId: string) {
  const field = await prisma.formField.findFirst({
    where: { id: fieldId, formId },
    include: { form: { select: { userId: true } } },
  });
  return field?.form.userId === userId;
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, fieldId } = await params;

    const hasAccess = await verifyFieldOwnership(formId, fieldId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await _request.json();
    const parsed = updateFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, label, description, required, options, validation, order } = parsed.data;

    if (type && options !== undefined) {
      const optionsError = validateFieldOptions(type as FieldType, options);
      if (optionsError) {
        return NextResponse.json({ error: optionsError }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (type !== undefined) updateData.type = type;
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.placeholder = description;
    if (required !== undefined) updateData.required = required;
    if (options !== undefined) updateData.options = options ?? null;
    if (validation !== undefined) updateData.validation = validation ?? null;
    if (order !== undefined) updateData.order = order;

    const field = await prisma.formField.update({
      where: { id: fieldId },
      data: updateData,
    });

    return NextResponse.json(field);
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, fieldId } = await params;

    const hasAccess = await verifyFieldOwnership(formId, fieldId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.formField.delete({ where: { id: fieldId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}