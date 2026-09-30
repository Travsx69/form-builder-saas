'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Edit, ExternalLink, MoreVertical, BarChart2 } from 'lucide-react';

interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: { responses: number };
}

interface FormsListClientProps {
  initialForms: Form[];
}

export function FormsListClient({ initialForms }: FormsListClientProps) {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>(initialForms);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newFormName, setNewFormName] = useState('');

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFormName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create form');

      const newForm = await response.json();
      setForms((prev) => [newForm, ...prev]);
      setNewFormName('');
      router.push(`/dashboard/forms/${newForm.id}/edit`);
    } catch {
      alert('Failed to create form');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) return;

    setIsDeleting(formId);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete form');

      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch {
      alert('Failed to delete form');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditClick = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/edit`);
  };

  const handleViewPublishedClick = (slug: string) => {
    window.open(`/f/${slug}`, '_blank', 'noopener,noreferrer');
  };

  const handleViewResponsesClick = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/responses`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateForm} className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
            placeholder="New form name"
            disabled={isCreating}
            aria-label="New form name"
          />
        </div>
        <Button type="submit" isLoading={isCreating} disabled={!newFormName.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </form>

      <Separator className="my-4" />

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">No forms yet</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Get started by creating your first form. You can add fields, customize the design, and start collecting responses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg cursor-pointer hover:underline" onClick={() => handleEditClick(form.id)}>
                      {form.name}
                    </CardTitle>
                    {form.description && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{form.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(form.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewPublishedClick(form.slug)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Published
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewResponsesClick(form.id)}>
                        <BarChart2 className="mr-2 h-4 w-4" />
                        View Responses
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting === form.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>Updated</span>
                  <span>{new Date(form.updatedAt).toLocaleDateString()}</span>
                  {form.isPublished && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Published
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}