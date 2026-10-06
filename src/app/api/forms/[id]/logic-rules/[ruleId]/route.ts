import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { wouldCreateCycle } from '@/lib/forms/logic';
import type { FieldType } from '@/lib/forms/types';

export const updateLogicRuleSchema = z.object({
  sourceFieldId: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains']),
  value: z.string().max(500),
  action: z.enum(['show', 'hide']),
  targetFieldId: z.string().min(1),
  enabled: z.boolean(),
});

/** Loads a rule, confirming it belongs to the caller's form. */
async function loadOwnedRule(formId: string, ruleId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      userId: true,
      fields: { select: { id: true, type: true } },
      logicRules: {
        select: { id: true, fieldId: true, targetField: true, enabled: true },
      },
    },
  });
  if (!form || form.userId !== userId) return null;
  const rule = form.logicRules.find((r) => r.id === ruleId);
  return rule ? { form, rule } : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, ruleId } = await params;
    const owned = await loadOwnedRule(formId, ruleId, session.user.id);
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const parsed = updateLogicRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { sourceFieldId, operator, value, action, targetFieldId, enabled } = parsed.data;

    const types = new Map(owned.form.fields.map((f) => [f.id, f.type as FieldType]));
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

    // Exclude this rule's current edge so editing it in place is not read as a
    // self-conflicting cycle.
    if (
      wouldCreateCycle(
        owned.form.logicRules
          .filter((r) => r.targetField && r.id !== ruleId)
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

    const rule = await prisma.logicRule.update({
      where: { id: ruleId },
      data: {
        fieldId: sourceFieldId,
        condition: operator,
        value,
        action,
        targetField: targetFieldId,
        enabled,
      },
    });

    return NextResponse.json(rule);
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: formId, ruleId } = await params;
    const owned = await loadOwnedRule(formId, ruleId, session.user.id);
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.logicRule.delete({ where: { id: ruleId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
