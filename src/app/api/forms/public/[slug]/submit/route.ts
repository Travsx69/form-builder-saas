import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSubmission } from '@/lib/forms/validation';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const form = await prisma.form.findUnique({
      where: { slug },
      select: {
        id: true,
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
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (!form.isPublished) {
      return NextResponse.json({ error: 'Form is not published' }, { status: 403 });
    }

    const { allowed, retryAfter } = checkRateLimit(`${clientIp(request)}:${form.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const fieldValues = body.fieldValues as Record<string, unknown> | undefined;

    if (!fieldValues) {
      return NextResponse.json({ error: 'fieldValues is required' }, { status: 400 });
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

    const validationResult = validateSubmission(fields, fieldValues);

    if (!validationResult.success) {
      return NextResponse.json(
        { fieldErrors: validationResult.errors },
        { status: 400 }
      );
    }

    // Create response and response values
    const response = await prisma.response.create({
      data: {
        formId: form.id,
        userId: null, // Public submission
        values: {
          create: Object.entries(validationResult.values!).map(([fieldId, value]) => ({
            fieldId,
            // Arrays (checkboxes) are stored as JSON so option labels may contain commas.
            value: Array.isArray(value) ? JSON.stringify(value) : String(value),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, responseId: response.id });
  } catch (error) {
    console.error('Public form submission error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}