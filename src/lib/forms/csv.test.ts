import { describe, it, expect } from 'vitest';
import { escapeCsvValue, generateCsv } from './csv';

describe('CSV formula injection', () => {
  it('neutralizes dangerous leading characters', () => {
    for (const payload of ['=1+1', '+1', '-1', '@SUM(A1)', '\tX', '\rX']) {
      expect(escapeCsvValue(payload)).toBe(`'${payload}`);
    }
  });

  it('leaves ordinary values untouched', () => {
    expect(escapeCsvValue('Hello world')).toBe('Hello world');
    expect(escapeCsvValue('Sales, Marketing')).toBe('"Sales, Marketing"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    // A dash mid-value is not a formula trigger.
    expect(escapeCsvValue('a-b')).toBe('a-b');
  });

  it('neutralizes formulas in exported rows', () => {
    const csv = generateCsv(
      { name: 'F', fields: [{ id: 'f1', label: 'Name', type: 'short_text' }] },
      [
        {
          submittedAt: new Date('2024-01-01T00:00:00.000Z'),
          values: [{ fieldId: 'f1', value: '=cmd|calc' }],
        },
      ]
    );
    expect(csv.split('\n')[1]).toBe("2024-01-01T00:00:00.000Z,'=cmd|calc");
  });
});

describe('generateCsv', () => {
  const form = {
    name: 'F',
    fields: [
      { id: 'f1', label: 'Name', type: 'short_text' },
      { id: 'f2', label: 'Interests', type: 'checkboxes' },
    ],
  };

  it('renders checkbox values as a readable list', () => {
    const csv = generateCsv(form, [
      {
        submittedAt: new Date('2024-01-01T00:00:00.000Z'),
        values: [
          { fieldId: 'f1', value: 'Ada' },
          { fieldId: 'f2', value: JSON.stringify(['Sales, Marketing', 'Support']) },
        ],
      },
    ]);
    expect(csv.split('\n')[1]).toBe('2024-01-01T00:00:00.000Z,Ada,"Sales, Marketing, Support"');
  });

  it('still renders legacy comma-joined checkbox values', () => {
    const csv = generateCsv(form, [
      {
        submittedAt: new Date('2024-01-01T00:00:00.000Z'),
        values: [{ fieldId: 'f2', value: 'Support, Sales' }],
      },
    ]);
    expect(csv.split('\n')[1]).toBe('2024-01-01T00:00:00.000Z,,"Support, Sales"');
  });

  it('keeps the header format and missing values blank', () => {
    const csv = generateCsv(form, []);
    expect(csv).toBe('Submitted At,Name,Interests');
  });
});
