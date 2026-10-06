import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { wouldCreateCycle } from '@/lib/forms/logic';
import type { FieldType } from '@/lib/forms/types';

export const createLogicRuleSchema = z.object({
  sourceFieldId: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains']),
  value: z.string().max(500),
  action: z.enum(['show', 'hide']),
  targetFieldId: z.string().min(1),
  enabled: z.boolean().default(true),
});

async function loadOwnedForm(formId: string, userId: string) {
  return prisma.form.findUnique({
    where: { id: formId },
    select: {
      userId: true,
      fields: { select: { id: true, type: true }, orderBy: { order: 'asc' } },
      logicRules: {
        select: { id: true, fieldId: true, targetField: true, enabled: true },
      },
    },
  });
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
    const form = await loadOwnedForm(formId, session.user.id);

    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (form.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createLogicRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { sourceFieldId, operator, value, action, targetFieldId, enabled } = parsed.data;

    const types = new Map(form.fields.map((f) => [f.id, f.type as FieldType]));
    if (!types.has(sourceFieldId)) {
      return NextResponse.json({ error: 'Unknown source field' }, { status: 400 });
    }
    if (!types.has(targetFieldId)) {
      return NextResponse.json({ error: 'Unknown target field' }, { status: 400 });
    }
    if (sourceFieldId === targetFieldId) {
      return NextResponse.json(
        { error: 'A field cannot control itself' },
        { status: 400 }
      );
    }

    if (
      wouldCreateCycle(
        form.logicRules
          .filter((r) => r.targetField)
          .map((r) => ({ source: r.fieldId, target: r.targetField! })),
        sourceFieldId,
        targetFieldId
      )
    ) {
      return NextResponse.json(
        { error: 'That rule would create a circular dependency' },
        { status: 400 }
      );
    }

    const rule = await prisma.logicRule.create({
      data: {
        formId,
        fieldId: sourceFieldId,
        condition: operator,
        value,
        action,
        targetField: targetFieldId,
        enabled,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
