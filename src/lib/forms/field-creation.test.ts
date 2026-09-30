import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFieldSchema, validateFieldOptions } from './validation';

describe('Field creation API validation', () => {
  describe('createFieldSchema', () => {
    it('accepts null options for non-choice fields', () => {
      const payload = {
        type: 'short_text',
        label: 'Test Field',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options).toBeNull();
      }
    });

    it('accepts array options for choice fields', () => {
      const payload = {
        type: 'multiple_choice',
        label: 'Test Field',
        description: '',
        required: false,
        options: ['Option 1', 'Option 2'],
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options).toEqual(['Option 1', 'Option 2']);
      }
    });

    it('accepts empty options array at schema level (validateFieldOptions rejects)', () => {
      const payload = {
        type: 'multiple_choice',
        label: 'Test Field',
        description: '',
        required: false,
        options: [],
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
      // validateFieldOptions should catch this
      expect(validateFieldOptions('multiple_choice', [])).toBe('Choice fields must have at least one option');
    });

    it('accepts null options for email', () => {
      const payload = {
        type: 'email',
        label: 'Email',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts null options for number', () => {
      const payload = {
        type: 'number',
        label: 'Number',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts null options for rating', () => {
      const payload = {
        type: 'rating',
        label: 'Rating',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts null options for date', () => {
      const payload = {
        type: 'date',
        label: 'Date',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts null options for yes_no', () => {
      const payload = {
        type: 'yes_no',
        label: 'Yes/No',
        description: '',
        required: false,
        options: null,
      };
      const result = createFieldSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('validateFieldOptions', () => {
    it('returns null for non-choice fields with null options', () => {
      expect(validateFieldOptions('short_text', null)).toBeNull();
      expect(validateFieldOptions('email', null)).toBeNull();
      expect(validateFieldOptions('number', null)).toBeNull();
      expect(validateFieldOptions('rating', null)).toBeNull();
      expect(validateFieldOptions('date', null)).toBeNull();
      expect(validateFieldOptions('yes_no', null)).toBeNull();
    });

    it('returns error for choice fields with null options', () => {
      expect(validateFieldOptions('multiple_choice', null)).toBe('Choice fields must have at least one option');
      expect(validateFieldOptions('checkboxes', null)).toBe('Choice fields must have at least one option');
      expect(validateFieldOptions('dropdown', null)).toBe('Choice fields must have at least one option');
    });

    it('returns error for choice fields with empty options', () => {
      expect(validateFieldOptions('multiple_choice', [])).toBe('Choice fields must have at least one option');
    });

    it('returns null for choice fields with valid options', () => {
      expect(validateFieldOptions('multiple_choice', ['A', 'B'])).toBeNull();
      expect(validateFieldOptions('checkboxes', ['A', 'B'])).toBeNull();
      expect(validateFieldOptions('dropdown', ['A', 'B'])).toBeNull();
    });
  });
});