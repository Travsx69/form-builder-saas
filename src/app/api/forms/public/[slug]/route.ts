import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { FieldType } from '@/lib/forms/types';

interface PublicFormField {
  id: string;
  type: FieldType;
  label: string;
  description: string | null;
  required: boolean;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  order: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const form = await prisma.form.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        isPublished: true,
        fields: {
          select: {
            id: true,
            type: true,
            label: true,
            placeholder: true,
            required: true,
            options: true,
            validation: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        logicRules: {
          select: {
            id: true,
            formId: true,
            fieldId: true,
            condition: true,
            value: true,
            action: true,
            targetField: true,
            enabled: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (!form.isPublished) {
      return NextResponse.json({ error: 'Form is not published' }, { status: 403 });
    }

    const fields: PublicFormField[] = form.fields.map((f) => ({
      id: f.id,
      type: f.type as FieldType,
      label: f.label,
      description: f.placeholder,
      required: f.required,
      options: f.options as string[] | null,
      validation: f.validation as Record<string, unknown> | null,
      order: f.order,
    }));

    return NextResponse.json({
      id: form.id,
      name: form.name,
      description: form.description,
      slug: form.slug,
      fields,
      logicRules: form.logicRules,
    });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}