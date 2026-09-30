import { parseCheckboxValue } from './value';

// Spreadsheets evaluate a leading = + - @ (or TAB/CR) as a formula.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvValue(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function generateCsv(
  form: { name: string; fields: { id: string; label: string; type: string }[] },
  responses: { submittedAt: Date; values: { fieldId: string; value: string }[] }[]
): string {
  const fieldLabels = form.fields.map((f) => f.label);
  const fieldIds = form.fields.map((f) => f.id);

  const header = ['Submitted At', ...fieldLabels].map(escapeCsvValue).join(',');

  const rows = responses.map((response) => {
    const valueMap = new Map(response.values.map((v) => [v.fieldId, v.value]));
    const rowValues = fieldIds.map((id, i) => {
      const raw = valueMap.get(id) || '';
      return form.fields[i].type === 'checkboxes' ? parseCheckboxValue(raw).join(', ') : raw;
    });
    return [new Date(response.submittedAt).toISOString(), ...rowValues].map(escapeCsvValue).join(',');
  });

  return [header, ...rows].join('\n');
}
