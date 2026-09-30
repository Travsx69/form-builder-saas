import { describe, it, expect } from 'vitest';
import { cn, generateSlug } from '../index';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('handles tailwind merge conflicts', () => {
    expect(cn('p-2 p-4')).toBe('p-4');
  });
});

describe('generateSlug', () => {
  it('generates slug from name', () => {
    expect(generateSlug('My Form')).toBe('my-form');
  });

  it('handles special characters', () => {
    expect(generateSlug('My Form! @#$')).toBe('my-form');
  });

  it('handles multiple spaces', () => {
    expect(generateSlug('My   Form')).toBe('my-form');
  });

  it('trims leading and trailing dashes', () => {
    expect(generateSlug('  My Form  ')).toBe('my-form');
  });
});