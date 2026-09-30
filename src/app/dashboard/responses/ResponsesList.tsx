import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResponsesListProps {
  userId: string;
}

interface ResponseWithRelations {
  id: string;
  formId: string;
  userId: string | null;
  submittedAt: Date;
  metadata: unknown;
  form: {
    id: string;
    name: string;
    slug: string;
  };
  values: Array<{
    id: string;
    responseId: string;
    fieldId: string;
    value: string;
    field: {
      label: string;
      type: string;
    };
  }>;
}

async function getResponses(userId: string): Promise<ResponseWithRelations[]> {
  return prisma.response.findMany({
    where: { form: { userId } },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    include: {
      form: { select: { id: true, name: true, slug: true } },
      values: { include: { field: { select: { label: true, type: true } } } },
    },
  }) as Promise<ResponseWithRelations[]>;
}

export async function ResponsesList({ userId }: ResponsesListProps) {
  const responses = await getResponses(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Responses</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">View and manage form responses</p>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">No responses yet</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Responses will appear here when someone submits your forms.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Form</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Submitted</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100">{response.form.name}</td>
                      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(response.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                        {response.values.map((v) => `${v.field.label}: ${v.value}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}