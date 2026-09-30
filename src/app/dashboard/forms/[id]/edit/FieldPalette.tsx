'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FIELD_TYPES, FieldType } from '@/lib/forms/types';
import { cn } from '@/lib/utils';

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  disabled?: boolean;
}

export function FieldPalette({ onAddField, disabled }: FieldPaletteProps) {
  return (
    <div className="w-56 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 overflow-y-auto">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Field</h2>
      <div className="space-y-2">
        {FIELD_TYPES.map((fieldType) => (
          <Button
            key={fieldType.type}
            variant="outline"
            className={cn(
              'w-full justify-start gap-3 text-sm',
              !fieldType.hasOptions && 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
            )}
            onClick={() => onAddField(fieldType.type)}
            disabled={disabled}
          >
            <fieldType.icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>{fieldType.label}</span>
          </Button>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
        <p>Click a field type to add it to your form.</p>
        <p>Drag to reorder (coming soon).</p>
      </div>
    </div>
  );
}