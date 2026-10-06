import type { FieldType } from './types';

/**
 * Conditional logic MVP: WHEN [source field] [operator] [value]
 * THEN show/hide [target field].
 *
 * The evaluator lives here, not in a component or route, because the browser
 * and the submission endpoint must agree exactly — the browser hides a field,
 * the server decides whether it is required. Both call `computeVisibility`.
 */

export type LogicOperator = 'equals' | 'not_equals' | 'contains';
export type LogicAction = 'show' | 'hide';

export interface LogicRule {
  id: string;
  formId: string;
  /** Source field: the question whose answer is inspected. Prisma `field_id`. */
  fieldId: string;
  /** Comparison operator. Prisma `condition`. */
  condition: string;
  value: string | null;
  action: string;
  /** Target field: the question shown or hidden. Prisma `target_field`. */
  targetField: string | null;
  enabled: boolean;
}

const TEXT_LIKE: FieldType[] = ['short_text', 'long_text', 'email'];
const NUMERIC: FieldType[] = ['number', 'rating'];

export const OPERATOR_LABELS: Record<LogicOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
};

/**
 * Operators offered per source type. Checkboxes answer with an array, so
 * `equals` would compare against a serialized blob; only `contains` (i.e. "this
 * option is among the selections") is meaningful for them.
 */
export function operatorsForSourceType(type: FieldType): LogicOperator[] {
  if (TEXT_LIKE.includes(type)) return ['equals', 'not_equals', 'contains'];
  if (type === 'checkboxes') return ['contains'];
  return ['equals', 'not_equals'];
}

export function isLogicOperator(value: unknown): value is LogicOperator {
  return value === 'equals' || value === 'not_equals' || value === 'contains';
}

export function isLogicAction(value: unknown): value is LogicAction {
  return value === 'show' || value === 'hide';
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isBlank(answer: unknown): boolean {
  return (
    answer === undefined ||
    answer === null ||
    answer === '' ||
    (Array.isArray(answer) && answer.length === 0)
  );
}

/**
 * A blank source answer never matches, under any operator. Otherwise
 * "show when not_equals X" would fire on an unanswered question and surface
 * fields the respondent was never shown.
 */
export function evaluateCondition(
  sourceType: FieldType,
  operator: LogicOperator,
  expected: string | null,
  answer: unknown
): boolean {
  if (isBlank(answer) || expected === null) return false;

  if (Array.isArray(answer)) {
    const wanted = normalize(expected);
    const has = answer.some((v) => normalize(String(v)) === wanted);
    return operator === 'contains' ? has : false;
  }

  if (NUMERIC.includes(sourceType)) {
    const left = Number(answer);
    const right = Number(expected);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    return operator === 'not_equals' ? left !== right : left === right;
  }

  const left = normalize(String(answer));
  const right = normalize(expected);

  switch (operator) {
    case 'equals':
      return left === right;
    case 'not_equals':
      return left !== right;
    case 'contains':
      return left.includes(right);
  }
}

/**
 * Ids of fields the respondent can currently see.
 *
 * A field with no rules is always visible, so forms without rules behave
 * exactly as they did before this feature.
 *
 * With rules, the baseline depends on which actions are present:
 *
 * - Any `show` rule present -> baseline hidden. The field appears only when a
 *   `show` rule matches, so "show B when A = X" keeps B hidden while A is blank.
 * - Only `hide` rules present -> baseline visible. "Hide B when A = X" must not
 *   also hide B while A is blank.
 *
 * A matching `hide` rule always wins over a matching `show` rule, so a rule
 * that withdraws a field is never undone by one that reveals it. The result
 * depends only on the rule set, never on rule order.
 */
export function computeVisibility(
  fields: { id: string; type: FieldType }[],
  rules: LogicRule[],
  answers: Record<string, unknown>
): Set<string> {
  const byTarget = new Map<string, LogicRule[]>();
  for (const rule of rules) {
    if (!rule.enabled || !rule.targetField) continue;
    const list = byTarget.get(rule.targetField) ?? [];
    list.push(rule);
    byTarget.set(rule.targetField, list);
  }

  const typeById = new Map(fields.map((f) => [f.id, f.type]));
  const visible = new Set<string>();

  for (const field of fields) {
    const targeting = byTarget.get(field.id) ?? [];
    if (targeting.length === 0) {
      visible.add(field.id);
      continue;
    }

    let shown = false;
    let hidden = false;
    let hasShowRule = false;
    for (const rule of targeting) {
      // A rule whose source field no longer exists, or whose operator is not
      // recognised, cannot be evaluated. Count it as absent rather than
      // inert-but-present: a dangling `show` rule must not otherwise pin the
      // field hidden forever.
      const sourceType = rule.fieldId ? typeById.get(rule.fieldId) : undefined;
      if (!sourceType || !isLogicOperator(rule.condition)) continue;

      if (rule.action !== 'hide') hasShowRule = true;

      const matched = evaluateCondition(
        sourceType,
        rule.condition,
        rule.value,
        answers[rule.fieldId]
      );
      if (rule.action === 'hide') {
        if (matched) hidden = true;
      } else if (matched) {
        shown = true;
      }
    }

    const baseline = hasShowRule ? shown : true;
    if (!hidden && baseline) visible.add(field.id);
  }

  return visible;
}

/**
 * True when adding `from -> to` would make the dependency graph cyclic.
 *
 * `hide` rules cannot participate in a runtime cycle, but every edge is checked
 * regardless of action: a rule that is merely disabled today could be enabled
 * later and silently reintroduce the cycle.
 */
export function wouldCreateCycle(
  edges: { source: string; target: string }[],
  from: string,
  to: string
): boolean {
  if (from === to) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  // A cycle appears iff `to` can already reach `from`.
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === from) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }

  return false;
}
