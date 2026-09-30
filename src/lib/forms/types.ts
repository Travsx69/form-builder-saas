import {
  Type,
  AlignLeft,
  Mail,
  Hash,
  List,
  CheckSquare,
  ChevronsUpDown,
  Star,
  Calendar,
  HelpCircle,
} from 'lucide-react';

export const FIELD_TYPES = [
  {
    type: 'short_text',
    label: 'Short Text',
    description: 'Single line text input',
    icon: Type,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'long_text',
    label: 'Long Text',
    description: 'Multi-line text area',
    icon: AlignLeft,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email address input with validation',
    icon: Mail,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input',
    icon: Hash,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Single selection from options',
    icon: List,
    hasOptions: true,
    defaultOptions: ['Option 1', 'Option 2', 'Option 3'],
  },
  {
    type: 'checkboxes',
    label: 'Checkboxes',
    description: 'Multiple selections from options',
    icon: CheckSquare,
    hasOptions: true,
    defaultOptions: ['Option 1', 'Option 2', 'Option 3'],
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    description: 'Single selection from dropdown',
    icon: ChevronsUpDown,
    hasOptions: true,
    defaultOptions: ['Option 1', 'Option 2', 'Option 3'],
  },
  {
    type: 'rating',
    label: 'Rating',
    description: 'Star rating input',
    icon: Star,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker input',
    icon: Calendar,
    hasOptions: false,
    defaultOptions: null,
  },
  {
    type: 'yes_no',
    label: 'Yes/No',
    description: 'Binary choice',
    icon: HelpCircle,
    hasOptions: false,
    defaultOptions: null,
  },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]['type'];

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description: string | null;
  required: boolean;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  order: number;
  formId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  email: 'Email',
  number: 'Number',
  multiple_choice: 'Multiple Choice',
  checkboxes: 'Checkboxes',
  dropdown: 'Dropdown',
  rating: 'Rating',
  date: 'Date',
  yes_no: 'Yes/No',
};

export function getFieldTypeConfig(type: FieldType) {
  return FIELD_TYPES.find((f) => f.type === type);
}

export function isChoiceField(type: FieldType): boolean {
  return ['multiple_choice', 'checkboxes', 'dropdown'].includes(type);
}