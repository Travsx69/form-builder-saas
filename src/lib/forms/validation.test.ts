import { describe, it, expect } from 'vitest';
import {
  validateFieldValue,
  validateSubmission,
  type ValidationResult,
} from './validation';
import type { FieldType } from './types';

describe('Form validation', () => {
  const baseField = {
    id: 'field-1',
    label: 'Test Field',
    required: false,
    options: null,
    validation: null,
  };

  describe('validateFieldValue', () => {
    it('returns null for empty optional field', () => {
      const field = { ...baseField, type: 'short_text' as FieldType, required: false };
      expect(validateFieldValue(field, '')).toBeNull();
      expect(validateFieldValue(field, undefined)).toBeNull();
      expect(validateFieldValue(field, null)).toBeNull();
    });

    it('returns error for empty required field', () => {
      const field = { ...baseField, type: 'short_text' as FieldType, required: true };
      expect(validateFieldValue(field, '')).toBe('Test Field is required');
      expect(validateFieldValue(field, undefined)).toBe('Test Field is required');
      expect(validateFieldValue(field, null)).toBe('Test Field is required');
    });

    it('validates email format', () => {
      const field = { ...baseField, type: 'email' as FieldType };
      expect(validateFieldValue(field, 'valid@email.com')).toBeNull();
      expect(validateFieldValue(field, 'invalid-email')).toBe('Test Field must be a valid email address');
      expect(validateFieldValue(field, 'no@domain')).toBe('Test Field must be a valid email address');
      expect(validateFieldValue(field, '@nodomain.com')).toBe('Test Field must be a valid email address');
    });

    it('validates number field', () => {
      const field = { ...baseField, type: 'number' as FieldType };
      expect(validateFieldValue(field, 42)).toBeNull();
      expect(validateFieldValue(field, '42')).toBeNull();
      expect(validateFieldValue(field, 'abc')).toBe('Test Field must be a valid number');
      expect(validateFieldValue(field, NaN)).toBe('Test Field must be a valid number');
    });

    it('validates number min/max', () => {
      const field = {
        ...baseField,
        type: 'number' as FieldType,
        validation: { min: 0, max: 100 },
      };
      expect(validateFieldValue(field, 50)).toBeNull();
      expect(validateFieldValue(field, -1)).toBe('Test Field must be at least 0');
      expect(validateFieldValue(field, 101)).toBe('Test Field must be at most 100');
    });

    it('validates number integer', () => {
      const field = {
        ...baseField,
        type: 'number' as FieldType,
        validation: { integer: true },
      };
      expect(validateFieldValue(field, 5)).toBeNull();
      expect(validateFieldValue(field, 5.5)).toBe('Test Field must be an integer');
    });

    it('validates multiple_choice field', () => {
      const field = {
        ...baseField,
        type: 'multiple_choice' as FieldType,
        options: ['Option A', 'Option B', 'Option C'],
      };
      expect(validateFieldValue(field, 'Option A')).toBeNull();
      expect(validateFieldValue(field, 'Option D')).toBe('Test Field must be one of the available options');
      expect(validateFieldValue(field, 123)).toBe('Test Field must be a single selection');
    });

    it('validates dropdown field', () => {
      const field = {
        ...baseField,
        type: 'dropdown' as FieldType,
        options: ['Option A', 'Option B', 'Option C'],
      };
      expect(validateFieldValue(field, 'Option A')).toBeNull();
      expect(validateFieldValue(field, 'Option D')).toBe('Test Field must be one of the available options');
    });

    it('validates checkboxes field', () => {
      const field = {
        ...baseField,
        type: 'checkboxes' as FieldType,
        options: ['Option A', 'Option B', 'Option C'],
      };
      expect(validateFieldValue(field, ['Option A'])).toBeNull();
      expect(validateFieldValue(field, ['Option A', 'Option B'])).toBeNull();
      expect(validateFieldValue(field, ['Option D'])).toBe('Test Field contains an invalid option');
      expect(validateFieldValue(field, 'not-array')).toBe('Test Field must be a list of selections');
    });

    it('validates checkboxes min/max selections', () => {
      const field = {
        ...baseField,
        type: 'checkboxes' as FieldType,
        options: ['Option A', 'Option B', 'Option C'],
        validation: { minSelections: 1, maxSelections: 2 },
      };
      expect(validateFieldValue(field, ['Option A'])).toBeNull();
      expect(validateFieldValue(field, [])).toBe('Test Field requires at least 1 selections');
      expect(validateFieldValue(field, ['Option A', 'Option B', 'Option C'])).toBe(
        'Test Field allows at most 2 selections'
      );
    });

    it('validates rating field', () => {
      const field = { ...baseField, type: 'rating' as FieldType };
      expect(validateFieldValue(field, 1)).toBeNull();
      expect(validateFieldValue(field, 5)).toBeNull();
      expect(validateFieldValue(field, 0)).toBe('Test Field must be a rating between 1 and 5');
      expect(validateFieldValue(field, 6)).toBe('Test Field must be a rating between 1 and 5');
      expect(validateFieldValue(field, '3')).toBeNull();
      expect(validateFieldValue(field, 'abc')).toBe('Test Field must be a rating between 1 and 5');
    });

    it('validates rating max', () => {
      const field = {
        ...baseField,
        type: 'rating' as FieldType,
        validation: { max: 10 },
      };
      expect(validateFieldValue(field, 5)).toBeNull();
      expect(validateFieldValue(field, 10)).toBeNull();
      expect(validateFieldValue(field, 11)).toBe('Test Field must be between 1 and 10');
    });

    it('validates date field', () => {
      const field = { ...baseField, type: 'date' as FieldType };
      expect(validateFieldValue(field, '2024-01-15')).toBeNull();
      expect(validateFieldValue(field, 'invalid-date')).toBe('Test Field must be a valid date');
    });

    it('validates date min/max', () => {
      const field = {
        ...baseField,
        type: 'date' as FieldType,
        validation: { min: '2024-01-01', max: '2024-12-31' },
      };
      expect(validateFieldValue(field, '2024-06-15')).toBeNull();
      expect(validateFieldValue(field, '2023-12-31')).toBe('Test Field must be on or after 2024-01-01');
      expect(validateFieldValue(field, '2025-01-01')).toBe('Test Field must be on or before 2024-12-31');
    });

    it('validates yes_no field', () => {
      const field = { ...baseField, type: 'yes_no' as FieldType };
      expect(validateFieldValue(field, 'yes')).toBeNull();
      expect(validateFieldValue(field, 'no')).toBeNull();
      expect(validateFieldValue(field, true)).toBeNull();
      expect(validateFieldValue(field, false)).toBeNull();
      expect(validateFieldValue(field, 'maybe')).toBe('Test Field must be yes or no');
    });

    it('validates text min/max length', () => {
      const field = {
        ...baseField,
        type: 'short_text' as FieldType,
        validation: { minLength: 2, maxLength: 10 },
      };
      expect(validateFieldValue(field, 'abc')).toBeNull();
      expect(validateFieldValue(field, 'a')).toBe('Test Field must be at least 2 characters');
      expect(validateFieldValue(field, 'abcdefghijk')).toBe('Test Field must be at most 10 characters');
    });

    it('validates text pattern', () => {
      const field = {
        ...baseField,
        type: 'short_text' as FieldType,
        validation: { pattern: '^[A-Z]{3}$' },
      };
      expect(validateFieldValue(field, 'ABC')).toBeNull();
      expect(validateFieldValue(field, 'abc')).toBe('Test Field format is invalid');
      expect(validateFieldValue(field, 'ABCD')).toBe('Test Field format is invalid');
    });
  });

  describe('validateSubmission', () => {
    const fields = [
      {
        id: 'field-1',
        type: 'short_text' as FieldType,
        label: 'Name',
        required: true,
        options: null,
        validation: null,
      },
      {
        id: 'field-2',
        type: 'email' as FieldType,
        label: 'Email',
        required: true,
        options: null,
        validation: null,
      },
      {
        id: 'field-3',
        type: 'multiple_choice' as FieldType,
        label: 'Choice',
        required: false,
        options: ['A', 'B', 'C'],
        validation: null,
      },
      {
        id: 'field-4',
        type: 'number' as FieldType,
        label: 'Age',
        required: true,
        options: null,
        validation: { min: 18 },
      },
    ];

    it('returns success for valid submission', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'A',
        'field-4': 25,
      });

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.values).toEqual({
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'A',
        'field-4': 25,
      });
    });

    it('returns error for missing required field', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-3': 'A',
        'field-4': 25,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-2': 'Email is required' });
    });

    it('returns error for invalid email', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'not-an-email',
        'field-3': 'A',
        'field-4': 25,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-2': 'Email must be a valid email address' });
    });

    it('returns error for invalid number', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'A',
        'field-4': 'not-a-number',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-4': 'Age must be a valid number' });
    });

    it('returns error for number below minimum', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'A',
        'field-4': 15,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-4': 'Age must be at least 18' });
    });

    it('returns error for invalid choice value', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'D',
        'field-4': 25,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-3': 'Choice must be one of the available options' });
    });

    it('returns error for unknown field ID', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-3': 'A',
        'field-4': 25,
        'field-5': 'unknown',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ 'field-5': 'Unknown field' });
    });

    it('rejects multiple errors', () => {
      const result = validateSubmission(fields, {
        'field-1': '',
        'field-2': 'invalid',
        'field-4': 15,
      });

      expect(result.success).toBe(false);
      expect(Object.keys(result.errors!)).toHaveLength(3);
    });

    it('handles optional fields correctly', () => {
      const result = validateSubmission(fields, {
        'field-1': 'John Doe',
        'field-2': 'john@example.com',
        'field-4': 25,
        // field-3 is optional and not provided
      });

      expect(result.success).toBe(true);
      expect(result.values).not.toHaveProperty('field-3');
    });
  });
});