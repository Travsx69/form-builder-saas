'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FieldPalette } from './FieldPalette';
import { FieldList } from './FieldList';
import { FieldSettings } from './FieldSettings';
import { FormField, FieldType } from '@/lib/forms/types';
import { Globe, Copy, Check, Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

interface FormBuilderProps {
  form: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    isPublished: boolean;
    fields: FormField[];
  };
}

export function FormBuilder({ form: initialForm }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialForm.fields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const handleAddField = useCallback(async (type: FieldType) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/forms/${form.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          label: getDefaultLabel(type),
          description: '',
          required: false,
          options: getDefaultOptions(type),
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to add field';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.fieldErrors || JSON.stringify(errorData);
        } catch {
          errorMsg = await response.text();
        }
        throw new Error(errorMsg);
      }

      const newField = await response.json();
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add field');
    } finally {
      setIsSaving(false);
    }
  }, [form.id]);

  const handleTogglePublished = useCallback(async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !form.isPublished }),
      });

      if (!response.ok) throw new Error('Failed to update form');

      const updatedForm = await response.json();
      setForm((prev) => ({ ...prev, ...updatedForm }));
      toast.success(updatedForm.isPublished ? 'Form published!' : 'Form unpublished');
    } catch {
      toast.error('Failed to update form');
    } finally {
      setIsPublishing(false);
    }
  }, [form.id, form.isPublished]);

  const handleCopyPublicUrl = useCallback(() => {
    if (!form.slug) return;
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Public URL copied to clipboard');
  }, [form.slug]);

  const handleUpdateField = useCallback(async (fieldId: string, data: Partial<FormField>) => {
    try {
      const response = await fetch(`/api/forms/${form.id}/fields/${fieldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update field');

      const updatedField = await response.json();
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updatedField : f)));
    } catch {
      alert('Failed to update field');
    }
  }, [form.id]);

  const handleDeleteField = useCallback(async (fieldId: string) => {
    if (!confirm('Delete this field?')) return;

    try {
      const response = await fetch(`/api/forms/${form.id}/fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete field');

      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
    } catch {
      alert('Failed to delete field');
    }
  }, [form.id, selectedFieldId]);

  const handleDuplicateField = useCallback(async (fieldId: string) => {
    const fieldToDuplicate = fields.find((f) => f.id === fieldId);
    if (!fieldToDuplicate) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/forms/${form.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fieldToDuplicate.type,
          label: `${fieldToDuplicate.label} (copy)`,
          description: fieldToDuplicate.description,
          required: fieldToDuplicate.required,
          options: fieldToDuplicate.options,
          validation: fieldToDuplicate.validation,
        }),
      });

      if (!response.ok) throw new Error('Failed to duplicate field');

      const newField = await response.json();
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
    } catch {
      alert('Failed to duplicate field');
    } finally {
      setIsSaving(false);
    }
  }, [form.id, fields]);

  const handleReorderFields = useCallback(async (fieldIds: string[]) => {
    try {
      await fetch(`/api/forms/${form.id}/fields/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldIds }),
      });
    } catch {
      alert('Failed to reorder fields');
    }
  }, [form.id]);

  const handleMoveField = useCallback(
    (fieldId: string, direction: 'up' | 'down') => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= fields.length) return;

      const newFields = [...fields];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      setFields(newFields);
      handleReorderFields(newFields.map((f) => f.id));
    },
    [fields, handleReorderFields]
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex h-full w-full flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={`/dashboard/forms`}>← Back</a>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{form.name}</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {form.isPublished ? 'Published' : 'Draft'} · {form.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Saved'}
            </Button>
            {form.slug && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPublicUrl}
                className="gap-1"
              >
                <Globe className="h-4 w-4" />
                Copy Public URL
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`/dashboard/forms/${form.id}/responses`}>
                <BarChart2 className="h-4 w-4 mr-1" />
                Responses
              </a>
            </Button>
            <Button
              variant={form.isPublished ? 'secondary' : 'default'}
              size="sm"
              onClick={handleTogglePublished}
              disabled={isPublishing}
              className="gap-1"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : form.isPublished ? (
                <>
                  <Check className="h-4 w-4" />
                  Published
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <FieldPalette onAddField={handleAddField} disabled={isSaving} />

          <Separator orientation="vertical" className="h-full" />

          <div className="flex flex-1 flex-col min-w-0">
            <FieldList
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onUpdateField={handleUpdateField}
              onDeleteField={handleDeleteField}
              onDuplicateField={handleDuplicateField}
              onMoveField={handleMoveField}
            />

            <Separator />

            <div className="flex-1 overflow-y-auto p-4">
              {selectedField ? (
                <FieldSettings
                  key={selectedField.id}
                  field={selectedField}
                  onUpdate={handleUpdateField}
                  allFields={fields}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <p>Select a field to edit its settings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: 'Short Text',
    long_text: 'Long Text',
    email: 'Email',
    number: 'Number',
    multiple_choice: 'Multiple Choice',
    checkboxes: 'Checkboxes',
    dropdown: 'Dropdown',
    rating: 'Rating',
    date: 'Date',
    yes_no: 'Yes/No',
  };
  return labels[type];
}

function getDefaultOptions(type: FieldType): string[] | null {
  if (['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) {
    return ['Option 1', 'Option 2', 'Option 3'];
  }
  return null;
}