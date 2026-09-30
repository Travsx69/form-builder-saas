import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ResponsesTable } from '@/components/dashboard/responses/ResponsesTable';

async function getFormWithResponses(formId: string, userId: string, page: number, limit: number) {
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

  return {
    form,
    responses,
    total,
    page,
    limit,
  };
}

export default async function FormResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id: formId } = await params;
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam || '1', 10);
  const limit = 20;

  const data = await getFormWithResponses(formId, session.user.id, page, limit);

  if (!data) {
    redirect('/dashboard/forms');
  }

  const { form, responses, total } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{form.name}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">View and manage form responses</p>
      </div>

      <ResponsesTable
        formId={form.id}
        formName={form.name}
        initialResponses={responses}
        total={total}
        page={page}
        limit={limit}
      />
    </div>
  );
}