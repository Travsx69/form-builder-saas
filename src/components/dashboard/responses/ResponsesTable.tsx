'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Trash2, Eye, Download, Loader2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ResponseValue {
  id: string;
  responseId: string;
  fieldId: string;
  value: string;
  field: {
    label: string;
    type: string;
  };
}

interface Response {
  id: string;
  formId: string;
  userId: string | null;
  submittedAt: string | Date;
  metadata: unknown;
  values: ResponseValue[];
}

interface ResponsesTableProps {
  formId: string;
  formName: string;
  initialResponses: Response[];
  total: number;
  page: number;
  limit: number;
}

export function ResponsesTable({ formId, formName, initialResponses, total, page, limit }: ResponsesTableProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [currentPage, setCurrentPage] = useState(page);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Delete this response? This action cannot be undone.')) return;

    setIsDeleting(responseId);
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${responseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete response');
      }

      setResponses((prev) => prev.filter((r) => r.id !== responseId));
      toast.success('Response deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete response');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/responses/export`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formName.replace(/[^a-z0-9]/gi, '_')}_responses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewResponse = (responseId: string) => {
    router.push(`/dashboard/forms/${formId}/responses/${responseId}`);
  };

  const totalPages = Math.ceil(total / limit);

  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">No responses yet</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
            Responses will appear here when someone submits your form.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Responses ({total})</h2>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Submitted</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Data</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {format(new Date(response.submittedAt), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                      {response.values.map((v) => `${v.field.label}: ${v.value}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewResponse(response.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteResponse(response.id)}
                            disabled={isDeleting === response.id}
                            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting === response.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}