'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { FormField, FieldType, isChoiceField, FIELD_TYPE_LABELS } from '@/lib/forms/types';

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'rating', label: 'Rating' },
  { value: 'date', label: 'Date' },
  { value: 'yes_no', label: 'Yes/No' },
];

interface FieldSettingsProps {
  field: FormField;
  onUpdate: (fieldId: string, data: Partial<FormField>) => void;
  allFields: FormField[];
}

export function FieldSettings({ field, onUpdate, allFields }: FieldSettingsProps) {
  const [localField, setLocalField] = useState<FormField>(field);

  const handleChange = (key: keyof FormField, value: unknown) => {
    const updated = { ...localField, [key]: value };
    setLocalField(updated);
    debouncedUpdate(updated);
  };

  const debouncedUpdate = (() => {
    let timeout: NodeJS.Timeout;
    return (updated: FormField) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        onUpdate(field.id, updated);
      }, 300);
    };
  })();

  const handleOptionChange = (index: number, value: string) => {
    if (!localField.options) return;
    const newOptions = [...localField.options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const handleAddOption = () => {
    const newOptions = [...(localField.options ?? []), `Option ${(localField.options?.length ?? 0) + 1}`];
    handleChange('options', newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (!localField.options || localField.options.length <= 1) return;
    const newOptions = localField.options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange('type', e.target.value as FieldType);
  };

  const showOptions = isChoiceField(localField.type);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Field Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Field Type</Label>
          <Select
            value={localField.type}
            onChange={handleTypeChange}
            options={FIELD_TYPE_OPTIONS}
            placeholder="Select field type"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            value={localField.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Enter field label"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localField.description ?? ''}
            onChange={(e) => handleChange('description', e.target.value || null)}
            placeholder="Help text for respondents"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>
            <input
              type="checkbox"
              checked={localField.required}
              onChange={(e) => handleChange('required', e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-zinc-300 text-zinc-600 focus:ring-zinc-500"
            />
            Required field
          </Label>
        </div>

        {showOptions && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-2">
              <Label>Options</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add, edit, or remove options for this field
              </p>
              {localField.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    disabled={!localField.options || localField.options.length <= 1}
                    aria-label="Remove option"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddOption}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Option
              </Button>
            </div>
          </div>
        )}

        <Separator />

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <p>Field ID: <code className="font-mono">{field.id}</code></p>
            <p>Type: <code className="font-mono">{FIELD_TYPE_LABELS[localField.type as keyof typeof FIELD_TYPE_LABELS]}</code></p>
            <p>Position: <code className="font-mono">{allFields.findIndex((f) => f.id === field.id) + 1}</code></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}