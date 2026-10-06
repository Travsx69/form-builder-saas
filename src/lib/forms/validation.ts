import { z } from 'zod';
import { FieldType, isChoiceField } from './types';

export const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(200),
  description: z.string().max(1000).optional(),
});

export const updateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const createFieldSchema = z.object({
  type: z.string(),
  label: z.string().min(1, 'Field label is required').max(200),
  description: z.string().max(500).optional().nullable(),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1)).nullable(),
  validation: z.unknown().optional().nullable(),
});

export const updateFieldSchema = z.object({
  type: z.string(),
  label: z.string().min(1, 'Field label is required').max(200),
  description: z.string().max(500).optional().nullable(),
  required: z.boolean(),
  options: z.array(z.string().min(1)).nullable(),
  validation: z.unknown().optional().nullable(),
  order: z.number().int().min(0),
});

export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string()).min(1),
});

export function validateFieldOptions(type: FieldType, options: string[] | null | undefined): string | null {
  if (!isChoiceField(type)) {
    return null;
  }
  if (!options || options.length === 0) {
    return 'Choice fields must have at least one option';
  }
  if (options.some((opt) => !opt.trim())) {
    return 'Options cannot be empty';
  }
  return null;
}

export const submitFormSchema = z.object({
  fieldValues: z.record(z.string(), z.unknown()),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
export type ReorderFieldsInput = z.infer<typeof reorderFieldsSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;

export interface ValidationResult {
  success: boolean;
  errors?: Record<string, string>;
  values?: Record<string, unknown>;
}

export function validateFieldValue(
  field: {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    options: string[] | null;
    validation: Record<string, unknown> | null;
  },
  value: unknown
): string | null {
  if (value === undefined || value === null || value === '') {
    if (field.required) {
      return `${field.label} is required`;
    }
    return null;
  }

  switch (field.type) {
    case 'short_text':
    case 'long_text':
      if (typeof value !== 'string') {
        return `${field.label} must be text`;
      }
      if (field.validation && typeof field.validation === 'object') {
        const v = field.validation as Record<string, unknown>;
        if (typeof v.minLength === 'number' && value.length < v.minLength) {
          return `${field.label} must be at least ${v.minLength} characters`;
        }
        if (typeof v.maxLength === 'number' && value.length > v.maxLength) {
          return `${field.label} must be at most ${v.maxLength} characters`;
        }
        if (typeof v.pattern === 'string') {
          try {
            const regex = new RegExp(v.pattern);
            if (!regex.test(value)) {
              return `${field.label} format is invalid`;
            }
          } catch {
            // Invalid regex, skip pattern validation
          }
        }
      }
      return null;

    case 'email':
      if (typeof value !== 'string') {
        return `${field.label} must be an email address`;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${field.label} must be a valid email address`;
      }
      return null;

    case 'number':
      if (typeof value !== 'number' && typeof value !== 'string') {
        return `${field.label} must be a number`;
      }
      const numValue = typeof value === 'string' ? Number(value) : value;
      if (isNaN(numValue)) {
        return `${field.label} must be a valid number`;
      }
      if (field.validation && typeof field.validation === 'object') {
        const v = field.validation as Record<string, unknown>;
        if (typeof v.min === 'number' && numValue < v.min) {
          return `${field.label} must be at least ${v.min}`;
        }
        if (typeof v.max === 'number' && numValue > v.max) {
          return `${field.label} must be at most ${v.max}`;
        }
        if (typeof v.integer === 'boolean' && v.integer && !Number.isInteger(numValue)) {
          return `${field.label} must be an integer`;
        }
      }
      return null;

    case 'multiple_choice':
    case 'dropdown':
      if (typeof value !== 'string') {
        return `${field.label} must be a single selection`;
      }
      if (!field.options || !field.options.includes(value)) {
        return `${field.label} must be one of the available options`;
      }
      return null;

    case 'checkboxes':
      if (!Array.isArray(value)) {
        return `${field.label} must be a list of selections`;
      }
      if (!field.options) {
        return `${field.label} has no available options`;
      }
      for (const v of value) {
        if (typeof v !== 'string' || !field.options.includes(v)) {
          return `${field.label} contains an invalid option`;
        }
      }
      if (field.validation && typeof field.validation === 'object') {
        const v = field.validation as Record<string, unknown>;
        if (typeof v.minSelections === 'number' && value.length < v.minSelections) {
          return `${field.label} requires at least ${v.minSelections} selections`;
        }
        if (typeof v.maxSelections === 'number' && value.length > v.maxSelections) {
          return `${field.label} allows at most ${v.maxSelections} selections`;
        }
      }
      return null;

    case 'rating':
      if (typeof value !== 'number' && typeof value !== 'string') {
        return `${field.label} must be a rating value`;
      }
      const ratingValue = typeof value === 'string' ? Number(value) : value;
      if (!Number.isInteger(ratingValue) || ratingValue < 1) {
        return `${field.label} must be a rating between 1 and 5`;
      }
      if (field.validation && typeof field.validation === 'object') {
        const v = field.validation as Record<string, unknown>;
        if (typeof v.max === 'number' && ratingValue > v.max) {
          return `${field.label} must be between 1 and ${v.max}`;
        }
      } else if (ratingValue > 5) {
        return `${field.label} must be a rating between 1 and 5`;
      }
      return null;

    case 'date':
      if (typeof value !== 'string') {
        return `${field.label} must be a date`;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${field.label} must be a valid date`;
      }
      if (field.validation && typeof field.validation === 'object') {
        const v = field.validation as Record<string, unknown>;
        if (typeof v.min === 'string') {
          const minDate = new Date(v.min);
          if (!isNaN(minDate.getTime()) && date < minDate) {
            return `${field.label} must be on or after ${v.min}`;
          }
        }
        if (typeof v.max === 'string') {
          const maxDate = new Date(v.max);
          if (!isNaN(maxDate.getTime()) && date > maxDate) {
            return `${field.label} must be on or before ${v.max}`;
          }
        }
      }
      return null;

    case 'yes_no':
      if (typeof value !== 'boolean' && typeof value !== 'string') {
        return `${field.label} must be yes or no`;
      }
      if (typeof value === 'string' && !['yes', 'no', 'true', 'false'].includes(value.toLowerCase())) {
        return `${field.label} must be yes or no`;
      }
      return null;

    default:
      return null;
  }
}

export function validateSubmission(
  fields: Array<{
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    options: string[] | null;
    validation: Record<string, unknown> | null;
  }>,
  submittedValues: Record<string, unknown>,
  /**
   * Fields the respondent can currently see, given the conditional rules.
   * Omit for forms without logic. A hidden field is not required and its
   * submitted value is discarded rather than stored.
   */
  visibleFieldIds?: ReadonlySet<string>
): ValidationResult {
  const errors: Record<string, string> = {};
  const validatedValues: Record<string, unknown> = {};

  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const isVisible = (id: string) => !visibleFieldIds || visibleFieldIds.has(id);

  // Check for unknown field IDs. Checked against every field, hidden or not, so
  // conditional logic cannot be used to smuggle a value past this guard.
  for (const fieldId of Object.keys(submittedValues)) {
    if (!fieldMap.has(fieldId)) {
      errors[fieldId] = 'Unknown field';
    }
  }

  for (const field of fields) {
    if (!isVisible(field.id)) {
      // Hidden: neither required, nor stored.
      continue;
    }

    const value = submittedValues[field.id];
    const error = validateFieldValue(field, value);

    if (error) {
      errors[field.id] = error;
    } else if (value !== undefined && value !== null && value !== '') {
      validatedValues[field.id] = value;
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    values: Object.keys(errors).length === 0 ? validatedValues : undefined,
  };
}