'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { FormField, FIELD_TYPE_LABELS } from '@/lib/forms/types';
import { cn } from '@/lib/utils';

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onUpdateField: (fieldId: string, data: Partial<FormField>) => void;
  onDeleteField: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
}

export function FieldList({
  fields,
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
  onMoveField,
}: FieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center dark:bg-zinc-800">
            <GripVertical className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No fields yet</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Add fields from the left panel to build your form
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="space-y-3 max-w-2xl mx-auto">
        {fields.map((field, index) => (
          <FieldCard
            key={field.id}
            field={field}
            index={index}
            isSelected={selectedFieldId === field.id}
            onSelect={() => onSelectField(field.id)}
            onUpdate={onUpdateField}
            onDelete={onDeleteField}
            onDuplicate={onDuplicateField}
            onMove={onMoveField}
            canMoveUp={index > 0}
            canMoveDown={index < fields.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface FieldCardProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (fieldId: string, data: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (fieldId: string) => void;
  onMove: (fieldId: string, direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function FieldCard({
  field,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  canMoveUp,
  canMoveDown,
}: FieldCardProps) {
  const isChoiceField = ['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type);

  const handleMoveUp = () => onMove(field.id, 'up');
  const handleMoveDown = () => onMove(field.id, 'down');
  const handleDuplicate = () => onDuplicate(field.id);
  const handleDelete = () => onDelete(field.id);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected
          ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 border-zinc-300 dark:border-zinc-700'
          : 'hover:border-zinc-300 dark:hover:border-zinc-700'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 text-zinc-400">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); handleMoveUp(); }}
              disabled={!canMoveUp}
              aria-label="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); handleMoveDown(); }}
              disabled={!canMoveDown}
              aria-label="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {field.label}
              </span>
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded dark:bg-zinc-800 dark:text-zinc-300">
                {FIELD_TYPE_LABELS[field.type as keyof typeof FIELD_TYPE_LABELS]}
              </span>
              {field.required && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded dark:bg-red-900/30 dark:text-red-400">
                  Required
                </span>
              )}
            </div>
            {field.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {field.description}
              </p>
            )}
            {isChoiceField && field.options && field.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {field.options.slice(0, 3).map((opt: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-700 rounded dark:bg-zinc-800 dark:text-zinc-300">
                    {opt}
                  </span>
                ))}
                {field.options.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    +{field.options.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}