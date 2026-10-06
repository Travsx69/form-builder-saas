'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldType, FormField } from '@/lib/forms/types';
import { computeVisibility, type LogicRule } from '@/lib/forms/logic';

interface PublicFormData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  fields: PublicFormField[];
  logicRules: LogicRule[];
}

interface PublicFormField extends FormField {
  // Extends FormField with description instead of placeholder
  description: string | null;
}

interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string | undefined>;
  isSubmitting: boolean;
  submitStatus: 'idle' | 'success' | 'error';
  submitError: string | null;
}

function FieldRenderer({ field, value, error, onChange, onBlur }: {
  field: PublicFormField;
  value: unknown;
  error: string | undefined;
  onChange: (fieldId: string, value: unknown) => void;
  onBlur: (fieldId: string) => void;
}) {
  const requiredMark = field.required ? <span className="text-red-500 ml-1" aria-hidden="true">*</span> : null;

  switch (field.type) {
    case 'short_text':
    case 'email':
      return (
        <div>
          <Label htmlFor={field.id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{field.description}</p>
          )}
          <Input
            id={field.id}
            type={field.type === 'email' ? 'email' : 'text'}
            value={(value as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.id, e.target.value)}
            onBlur={() => onBlur(field.id)}
            className={cn('mt-2', error && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${field.id}-error` : field.description ? `${field.id}-desc` : undefined}
          />
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'long_text':
      return (
        <div>
          <Label htmlFor={field.id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <Textarea
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(field.id, e.target.value)}
            onBlur={() => onBlur(field.id)}
            className={cn('mt-2', error && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${field.id}-error` : field.description ? `${field.id}-desc` : undefined}
            rows={4}
          />
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'number':
      return (
        <div>
          <Label htmlFor={field.id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <Input
            id={field.id}
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              onChange(field.id, val === '' ? '' : Number(val));
            }}
            onBlur={() => onBlur(field.id)}
            className={cn('mt-2', error && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${field.id}-error` : field.description ? `${field.id}-desc` : undefined}
            step="any"
          />
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'multiple_choice':
      return (
        <div>
          <Label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <div className="mt-2 space-y-2" role="radiogroup" aria-label={field.label} aria-required={field.required}>
            {field.options?.map((option, index) => (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-2 cursor-pointer p-3 border rounded-lg transition-colors',
                  (value as string) === option
                    ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800',
                  error && 'border-red-500'
                )}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={(value as string) === option}
                  onChange={() => onChange(field.id, option)}
                  onBlur={() => onBlur(field.id)}
                  className="h-4 w-4 text-zinc-900 border-zinc-300 focus:ring-2 focus:ring-zinc-900 dark:text-zinc-100 dark:border-zinc-600"
                  aria-invalid={error ? 'true' : 'false'}
                />
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{option}</span>
              </label>
            ))}
          </div>
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'checkboxes':
      return (
        <div>
          <Label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <div className="mt-2 space-y-2" role="group" aria-label={field.label} aria-required={field.required}>
            {field.options?.map((option, index) => (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-2 cursor-pointer p-3 border rounded-lg transition-colors',
                  (value as string[])?.includes(option)
                    ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800',
                  error && 'border-red-500'
                )}
              >
                <input
                  type="checkbox"
                  name={field.id}
                  value={option}
                  checked={(value as string[])?.includes(option) ?? false}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const current = ((value as string[]) ?? []) as string[];
                    if (e.target.checked) {
                      onChange(field.id, [...current, option]);
                    } else {
                      onChange(field.id, current.filter((v) => v !== option));
                    }
                  }}
                  onBlur={() => onBlur(field.id)}
                  className="h-4 w-4 text-zinc-900 border-zinc-300 rounded focus:ring-2 focus:ring-zinc-900 dark:text-zinc-100 dark:border-zinc-600"
                  aria-invalid={error ? 'true' : 'false'}
                />
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{option}</span>
              </label>
            ))}
          </div>
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'dropdown':
      return (
        <div>
          <Label htmlFor={field.id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <Select
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(field.id, e.target.value)}
            onBlur={() => onBlur(field.id)}
            options={field.options?.map((opt) => ({ value: opt, label: opt })) ?? []}
            placeholder="Select an option"
            className={cn('mt-2 w-full', error && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            error={error}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${field.id}-error` : field.description ? `${field.id}-desc` : undefined}
          />
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'rating':
      return (
        <div>
          <Label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label={field.label} aria-required={field.required}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={(value as number) === star}
                onClick={() => onChange(field.id, star)}
                onBlur={() => onBlur(field.id)}
                className={cn(
                  'p-1 text-2xl transition-colors',
                  (value as number) === star
                    ? 'text-amber-500'
                    : 'text-zinc-300 dark:text-zinc-700 hover:text-amber-300 dark:hover:text-amber-600',
                  error && 'opacity-50'
                )}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'date':
      return (
        <div>
          <Label htmlFor={field.id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <Input
            id={field.id}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(field.id, e.target.value)}
            onBlur={() => onBlur(field.id)}
            className={cn('mt-2', error && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${field.id}-error` : field.description ? `${field.id}-desc` : undefined}
          />
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    case 'yes_no':
      return (
        <div>
          <Label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {field.label} {requiredMark}
          </Label>
          {field.description && (
            <p id={`${field.id}-desc`} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4" role="radiogroup" aria-label={field.label} aria-required={field.required}>
            <label className={cn(
              'flex items-center gap-2 cursor-pointer',
              (value as string) === 'yes' && 'text-zinc-900 dark:text-zinc-100'
            )}>
              <input
                type="radio"
                name={field.id}
                value="yes"
                checked={(value as string) === 'yes'}
                onChange={() => onChange(field.id, 'yes')}
                onBlur={() => onBlur(field.id)}
                className="h-4 w-4 text-zinc-900 border-zinc-300 focus:ring-2 focus:ring-zinc-900 dark:text-zinc-100 dark:border-zinc-600"
                aria-invalid={error ? 'true' : 'false'}
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className={cn(
              'flex items-center gap-2 cursor-pointer',
              (value as string) === 'no' && 'text-zinc-900 dark:text-zinc-100'
            )}>
              <input
                type="radio"
                name={field.id}
                value="no"
                checked={(value as string) === 'no'}
                onChange={() => onChange(field.id, 'no')}
                onBlur={() => onBlur(field.id)}
                className="h-4 w-4 text-zinc-900 border-zinc-300 focus:ring-2 focus:ring-zinc-900 dark:text-zinc-100 dark:border-zinc-600"
                aria-invalid={error ? 'true' : 'false'}
              />
              <span className="text-sm">No</span>
            </label>
          </div>
          {error && (
            <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [state, setState] = useState<FormState>({
    values: {},
    errors: {},
    isSubmitting: false,
    submitStatus: 'idle',
    submitError: null,
  });
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logicRules, setLogicRules] = useState<LogicRule[]>([]);

  // Derived during render so a change to a source answer hides or reveals the
  // dependent field in the same commit as the keystroke — no flash of a field
  // the respondent should not see.
  const visibleFieldIds = formData
    ? computeVisibility(
        formData.fields.map((f) => ({ id: f.id, type: f.type })),
        logicRules,
        state.values
      )
    : new Set<string>();

  useEffect(() => {
    async function loadForm() {
      try {
        const { slug } = await params;
        const response = await fetch(`/api/forms/public/${slug}`);

        if (response.status === 404 || response.status === 403) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load form');
        }

        const data = await response.json();
        setFormData(data);
        setLogicRules(data.logicRules ?? []);

        // Initialize values
        const initialValues: Record<string, unknown> = {};
        data.fields.forEach((field: PublicFormField) => {
          if (field.type === 'checkboxes') {
            initialValues[field.id] = [];
          } else if (field.type === 'rating') {
            initialValues[field.id] = '';
          }
        });
        setState((prev) => ({ ...prev, values: initialValues }));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [params]);

  const handleChange = (fieldId: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      values: { ...prev.values, [fieldId]: value },
      errors: { ...prev.errors, [fieldId]: undefined },
    }));
  };

  const handleBlur = (fieldId: string) => {
    // Could add field-level validation on blur here if needed
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    setState((prev) => ({ ...prev, isSubmitting: true, submitStatus: 'idle', submitError: null }));

    // Only visible fields are sent. The server recomputes visibility and
    // discards hidden values regardless, so this is tidiness, not the control.
    const submittedValues: Record<string, unknown> = {};
    for (const field of formData.fields) {
      if (visibleFieldIds.has(field.id)) {
        submittedValues[field.id] = state.values[field.id];
      }
    }

    try {
      const response = await fetch(`/api/forms/public/${formData.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldValues: submittedValues }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            errors: data.fieldErrors,
            submitStatus: 'error',
            submitError: 'Please fix the errors below',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            submitStatus: 'error',
            submitError: data.error || 'Submission failed',
          }));
        }
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitStatus: 'success',
        values: {}, // Clear form
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitStatus: 'error',
        submitError: 'Network error. Please try again.',
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (notFound || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
            <CardTitle className="mt-4 text-lg">Form not available</CardTitle>
            <CardDescription className="mt-2">
              This form is either unpublished or does not exist.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4 text-lg">Thanks!</CardTitle>
            <CardDescription className="mt-2">Your response has been submitted.</CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {formData.name}
            </CardTitle>
            {formData.description && (
              <CardDescription className="mt-2 text-zinc-600 dark:text-zinc-400">
                {formData.description}
              </CardDescription>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
            {formData.fields.map((field) => (
              <div key={field.id} hidden={!visibleFieldIds.has(field.id)}>
                <FieldRenderer
                  field={field}
                  value={state.values[field.id]}
                  error={state.errors[field.id]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </div>
            ))}

            {state.submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{state.submitError}</span>
              </div>
            )}

            <Separator className="my-4" />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={state.isSubmitting}
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}