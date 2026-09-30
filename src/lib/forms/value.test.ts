import { describe, it, expect } from 'vitest';
import { parseCheckboxValue } from './value';

describe('parseCheckboxValue', () => {
  it('parses a JSON-stored selection containing a comma', () => {
    expect(parseCheckboxValue(JSON.stringify(['Sales, Marketing']))).toEqual(['Sales, Marketing']);
  });

  it('parses multiple selections', () => {
    expect(parseCheckboxValue(JSON.stringify(['Support', 'Sales']))).toEqual(['Support', 'Sales']);
  });

  it('preserves legacy comma-joined storage', () => {
    expect(parseCheckboxValue('Support, Sales')).toEqual(['Support', 'Sales']);
  });

  it('handles empty values', () => {
    expect(parseCheckboxValue('')).toEqual([]);
    expect(parseCheckboxValue('[]')).toEqual([]);
  });
});
