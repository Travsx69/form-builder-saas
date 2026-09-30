'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { parseCheckboxValue } from '@/lib/forms/value';

interface ResponseValue {
  id: string;
  responseId: string;
  fieldId: string;
  value: string;
  field: {
    label: string;
    type: string;
    placeholder: string | null;
  };
}

interface ResponseDetail {
  id: string;
  formId: string;
  userId: string | null;
  submittedAt: string | Date;
  metadata: unknown;
  values: ResponseValue[];
}

interface ResponseDetailProps {
  response: ResponseDetail;
  formId: string;
  formName: string;
}

export function ResponseDetail({ response, formId, formName }: ResponseDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this response? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${response.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete response');
      }

      toast.success('Response deleted');
      router.push(`/dashboard/forms/${formId}/responses`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete response');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses/export`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formName.replace(/[^a-z0-9]/gi, '_')}_response_${response.id}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Responses
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Response Detail</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{formName}</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Submitted</CardTitle>
              <CardDescription className="text-zinc-600 dark:text-zinc-400">
                {format(new Date(response.submittedAt), 'MMMM d, yyyy h:mm:ss a')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {response.values.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              No response data available
            </div>
          ) : (
            <dl className="space-y-6 divide-y divide-zinc-200 dark:divide-zinc-800">
              {response.values.map((value) => (
                <div key={value.id} className="py-4">
                  <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {value.field.label}
                  </dt>
                  {value.field.placeholder && (
                    <dd className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {value.field.placeholder}
                    </dd>
                  )}
                  <dd className="mt-2 text-zinc-900 dark:text-zinc-100">
                    <div className={cn(
                      'p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800',
                      value.field.type === 'rating' && 'font-mono text-xl',
                      value.field.type === 'checkboxes' && 'font-mono'
                    )}>
                      {value.field.type === 'checkboxes' ? (
                        parseCheckboxValue(value.value).length > 0 ? (
                          parseCheckboxValue(value.value).map((v) => <span key={v} className="inline-block mr-2 px-2 py-0.5 text-xs bg-zinc-200 text-zinc-700 rounded dark:bg-zinc-700 dark:text-zinc-300">{v}</span>)
                        ) : <span className="text-zinc-500 dark:text-zinc-400">None</span>
                      ) : (
                        value.value || <span className="text-zinc-500 dark:text-zinc-400">—</span>
                      )}
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}