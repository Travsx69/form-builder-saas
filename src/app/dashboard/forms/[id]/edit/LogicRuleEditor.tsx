'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import type { LogicOperator } from '@/lib/forms/logic';
import { OPERATOR_LABELS, operatorsForSourceType } from '@/lib/forms/logic';
import type { FormField } from '@/lib/forms/types';

/**
 * A draft rule being edited in the panel. Kept separate from the saved
 * `LogicRule` because an unsaved row may be incomplete.
 */
export interface RuleDraft {
  id: string;
  sourceFieldId: string;
  operator: LogicOperator;
  value: string;
  action: 'show' | 'hide';
  enabled: boolean;
  /** The field this rule controls. Lets a rule be found without its panel. */
  targetFieldId: string;
}

interface LogicRulesSectionProps {
  /** The field these rules control — always the selected field. */
  targetField: FormField;
  allFields: FormField[];
  rules: RuleDraft[];
  error: string | null;
  onCreate: (draft: Omit<RuleDraft, 'id' | 'targetFieldId'>) => void;
  onUpdate: (ruleId: string, patch: Partial<RuleDraft>) => void;
  onRemove: (ruleId: string) => void;
}

export function LogicRulesSection({
  targetField,
  allFields,
  rules,
  error,
  onCreate,
  onUpdate,
  onRemove,
}: LogicRulesSectionProps) {
  // A field cannot control itself, and only fields the user has already added
  // can serve as a source.
  const candidates = allFields.filter((f) => f.id !== targetField.id);

  if (candidates.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Conditional logic</Label>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add another field to this form first, then come back to control its
          visibility from an earlier answer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Conditional logic</Label>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Show or hide this field based on an earlier answer.
        </p>
      </div>

      {rules.map((rule) => {
        const source = allFields.find((f) => f.id === rule.sourceFieldId);
        const sourceType = source?.type ?? 'short_text';
        const operators = operatorsForSourceType(sourceType);
        const valueOptions = source?.options?.length
          ? source.options.map((o) => ({ value: o, label: o }))
          : null;

        return (
          <div
            key={rule.id}
            className="rounded-lg border border-zinc-200 p-3 space-y-3 dark:border-zinc-700"
          >
            <div className="flex items-center gap-2">
              <Select
                value={rule.action}
                onChange={(e) =>
                  onUpdate(rule.id, { action: e.target.value as RuleDraft['action'] })
                }
                options={[
                  { value: 'show', label: 'Show' },
                  { value: 'hide', label: 'Hide' },
                ]}
                className="w-24"
                aria-label="Rule action"
              />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">this field when</span>
              <label className="flex items-center gap-1.5 ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => onUpdate(rule.id, { enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-600 focus:ring-zinc-500"
                />
                Enabled
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(rule.id)}
                aria-label="Remove rule"
                className="h-8 w-8 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Select
                value={rule.sourceFieldId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const next = allFields.find((f) => f.id === nextId);
                  const allowed = operatorsForSourceType(next?.type ?? 'short_text');
                  // Keep the operator valid when the source type changes.
                  const operator = allowed.includes(rule.operator)
                    ? rule.operator
                    : allowed[0];
                  onUpdate(rule.id, { sourceFieldId: nextId, operator, value: '' });
                }}
                options={candidates.map((f) => ({ value: f.id, label: f.label }))}
                placeholder="Select a question"
                aria-label="Source field"
              />

              <div className="flex items-center gap-2">
                <Select
                  value={rule.operator}
                  onChange={(e) =>
                    onUpdate(rule.id, { operator: e.target.value as LogicOperator })
                  }
                  options={operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
                  className="w-32"
                  aria-label="Operator"
                />
                {valueOptions ? (
                  <Select
                    value={rule.value}
                    onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
                    options={valueOptions}
                    placeholder="Select an answer"
                    className="flex-1"
                    aria-label="Comparison value"
                  />
                ) : (
                  <Input
                    value={rule.value}
                    onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
                    placeholder="Answer"
                    aria-label="Comparison value"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onCreate({
            sourceFieldId: candidates[0]!.id,
            operator: operatorsForSourceType(candidates[0]!.type)[0]!,
            value: '',
            action: 'show',
            enabled: true,
          })
        }
        disabled={rules.length >= 5}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add rule
      </Button>
      {rules.length >= 5 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          This field already has the maximum of 5 rules.
        </p>
      )}
    </div>
  );
}
