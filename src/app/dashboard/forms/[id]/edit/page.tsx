import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FormBuilder } from './FormBuilder';
import { FormField } from '@/lib/forms/types';

async function getFormWithFields(formId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      fields: {
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

  if (!form || form.userId !== userId) {
    return null;
  }

  // Transform Prisma fields to FormField type (placeholder -> description)
  const fields: FormField[] = form.fields.map((f) => ({
    id: f.id,
    type: f.type as FormField['type'],
    label: f.label,
    description: f.placeholder,
    required: f.required,
    options: f.options as string[] | null,
    validation: f.validation as Record<string, unknown> | null,
    order: f.order,
    formId: f.formId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return {
    ...form,
    fields,
  };
}

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const form = await getFormWithFields(id, session.user.id);

  if (!form) {
    redirect('/dashboard/forms');
  }

  return <FormBuilder form={form} />;
}