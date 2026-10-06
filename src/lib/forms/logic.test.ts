import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  computeVisibility,
  operatorsForSourceType,
  wouldCreateCycle,
  type LogicRule,
} from './logic';
import type { FieldType } from './types';

function rule(partial: Partial<LogicRule> & { fieldId: string; targetField: string }): LogicRule {
  return {
    id: 'r1',
    formId: 'f1',
    condition: 'equals',
    value: 'yes',
    action: 'show',
    enabled: true,
    ...partial,
  };
}

describe('evaluateCondition', () => {
  it('evaluates equals on text, trimming and ignoring case', () => {
    expect(evaluateCondition('short_text', 'equals', 'Yes', 'yes')).toBe(true);
    expect(evaluateCondition('short_text', 'equals', 'yes', '  YES ')).toBe(true);
    expect(evaluateCondition('short_text', 'equals', 'yes', 'no')).toBe(false);
  });

  it('evaluates not_equals on text', () => {
    expect(evaluateCondition('short_text', 'not_equals', 'yes', 'no')).toBe(true);
    expect(evaluateCondition('short_text', 'not_equals', 'yes', 'yes')).toBe(false);
  });

  it('evaluates contains on text', () => {
    expect(evaluateCondition('long_text', 'contains', 'urgent', 'This is urgent')).toBe(true);
    expect(evaluateCondition('long_text', 'contains', 'urgent', 'all fine')).toBe(false);
  });

  it('compares numbers numerically, not as text', () => {
    expect(evaluateCondition('number', 'equals', '5', '5')).toBe(true);
    expect(evaluateCondition('number', 'equals', '5', 5)).toBe(true);
    // '10' vs '1' must not compare as a prefix match.
    expect(evaluateCondition('number', 'equals', '1', '10')).toBe(false);
    expect(evaluateCondition('number', 'not_equals', '5', 6)).toBe(true);
  });

  it('treats a blank source answer as no match under every operator', () => {
    for (const op of ['equals', 'not_equals', 'contains'] as const) {
      expect(evaluateCondition('short_text', op, 'yes', '')).toBe(false);
      expect(evaluateCondition('short_text', op, 'yes', undefined)).toBe(false);
      expect(evaluateCondition('short_text', op, 'yes', [])).toBe(false);
    }
  });

  it('evaluates a checkbox answer as option membership', () => {
    expect(evaluateCondition('checkboxes', 'contains', 'Sales', ['Sales', 'Support'])).toBe(true);
    expect(evaluateCondition('checkboxes', 'contains', 'Design', ['Sales'])).toBe(false);
  });

  it('never matches a checkbox answer for equals or not_equals', () => {
    expect(evaluateCondition('checkboxes', 'equals', 'Sales', ['Sales'])).toBe(false);
    expect(evaluateCondition('checkboxes', 'not_equals', 'Sales', ['Sales'])).toBe(false);
  });
});

describe('operatorsForSourceType', () => {
  it('offers contains only for text-like fields', () => {
    expect(operatorsForSourceType('short_text')).toContain('contains');
    expect(operatorsForSourceType('long_text')).toContain('contains');
    expect(operatorsForSourceType('email')).toContain('contains');
  });

  it('offers only contains for checkboxes, since answers are arrays', () => {
    expect(operatorsForSourceType('checkboxes')).toEqual(['contains']);
  });

  it('offers no contains for single-value and numeric fields', () => {
    for (const type of ['number', 'rating', 'date', 'yes_no', 'dropdown', 'multiple_choice'] as FieldType[]) {
      expect(operatorsForSourceType(type)).toEqual(['equals', 'not_equals']);
    }
  });
});

describe('computeVisibility', () => {
  const fields = [
    { id: 'a', type: 'yes_no' as FieldType },
    { id: 'b', type: 'short_text' as FieldType },
  ];

  it('shows every field when the form has no rules', () => {
    const visible = computeVisibility(fields, [], { a: 'yes', b: '' });
    expect(visible.has('a')).toBe(true);
    expect(visible.has('b')).toBe(true);
  });

  it('reveals the target when the show condition matches', () => {
    const visible = computeVisibility(fields, [rule({ fieldId: 'a', targetField: 'b' })], { a: 'yes' });
    expect(visible.has('b')).toBe(true);
  });

  it('keeps the target hidden when the show condition does not match', () => {
    const visible = computeVisibility(fields, [rule({ fieldId: 'a', targetField: 'b' })], { a: 'no' });
    expect(visible.has('b')).toBe(false);
    expect(visible.has('a')).toBe(true);
  });

  it('keeps the target hidden when the source is unanswered', () => {
    const visible = computeVisibility(fields, [rule({ fieldId: 'a', targetField: 'b' })], {});
    expect(visible.has('b')).toBe(false);
  });

  it('applies a hide rule, leaving the target visible while unmatched', () => {
    const rules = [rule({ fieldId: 'a', targetField: 'b', action: 'hide' })];
    expect(computeVisibility(fields, rules, { a: 'no' }).has('b')).toBe(true);
    expect(computeVisibility(fields, rules, { a: 'yes' }).has('b')).toBe(false);
  });

  it('requires only one of several show rules to match', () => {
    const rules = [
      rule({ id: 'r1', fieldId: 'a', targetField: 'b', value: 'yes' }),
      rule({ id: 'r2', fieldId: 'b', targetField: 'b', value: 'other' }),
    ];
    expect(computeVisibility(fields, rules, { a: 'yes' }).has('b')).toBe(true);
    expect(computeVisibility(fields, rules, { a: 'no' }).has('b')).toBe(false);
  });

  it('lets a matching hide rule win over a matching show rule', () => {
    const rules = [
      rule({ id: 'r1', fieldId: 'a', targetField: 'b', value: 'yes', action: 'show' }),
      rule({ id: 'r2', fieldId: 'a', targetField: 'b', value: 'yes', action: 'hide' }),
    ];
    expect(computeVisibility(fields, rules, { a: 'yes' }).has('b')).toBe(false);
  });

  it('ignores a disabled rule entirely', () => {
    const rules = [rule({ fieldId: 'a', targetField: 'b', enabled: false })];
    expect(computeVisibility(fields, rules, { a: 'yes' }).has('b')).toBe(true);
  });

  it('ignores a rule whose source field no longer exists', () => {
    const rules = [rule({ fieldId: 'deleted', targetField: 'b' })];
    expect(computeVisibility(fields, rules, { a: 'yes' }).has('b')).toBe(true);
  });
});

describe('wouldCreateCycle', () => {
  it('rejects a field controlling itself', () => {
    expect(wouldCreateCycle([], 'a', 'a')).toBe(true);
  });

  it('rejects a direct two-field cycle', () => {
    expect(wouldCreateCycle([{ source: 'a', target: 'b' }], 'b', 'a')).toBe(true);
  });

  it('rejects a longer cycle', () => {
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ];
    expect(wouldCreateCycle(edges, 'c', 'a')).toBe(true);
  });

  it('allows a rule that does not close a loop', () => {
    const edges = [{ source: 'a', target: 'b' }];
    expect(wouldCreateCycle(edges, 'a', 'c')).toBe(false);
    expect(wouldCreateCycle(edges, 'b', 'c')).toBe(false);
  });

  it('does not treat a repeated identical edge as a cycle', () => {
    const edges = [{ source: 'a', target: 'b' }];
    expect(wouldCreateCycle(edges, 'a', 'b')).toBe(false);
  });

  it('survives a diamond, which is not a cycle', () => {
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
      { source: 'c', target: 'd' },
    ];
    expect(wouldCreateCycle(edges, 'd', 'z')).toBe(false);
  });
});
