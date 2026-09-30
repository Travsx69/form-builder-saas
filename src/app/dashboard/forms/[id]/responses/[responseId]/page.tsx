import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ResponseDetail } from '@/components/dashboard/responses/ResponseDetail';

async function getResponseDetail(formId: string, responseId: string, userId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });

  if (!form || form.userId !== userId) {
    return null;
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
    return null;
  }

  return {
    form,
    response,
  };
}

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id: formId, responseId } = await params;

  const data = await getResponseDetail(formId, responseId, session.user.id);

  if (!data) {
    redirect('/dashboard/forms');
  }

  const { form, response } = data;

  return <ResponseDetail response={response} formId={form.id} formName={form.name} />;
}