import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogicRule } from '@/lib/forms/logic';

const form = {
  id: 'form1',
  isPublished: true,
  // a drives b; b is required.
  fields: [
    { id: 'a', type: 'yes_no', label: 'Do you have a dog?', placeholder: null, required: true, options: null, validation: null, order: 0 },
    { id: 'b', type: 'short_text', label: 'Dog name', placeholder: null, required: true, options: null, validation: null, order: 1 },
  ],
  logicRules: [] as unknown[],
};

const showDogName: LogicRule = {
  id: 'r1',
  formId: 'form1',
  fieldId: 'a',
  condition: 'equals',
  value: 'yes',
  action: 'show',
  targetField: 'b',
  enabled: true,
};

interface CreateArgs {
  data: {
    formId: string;
    values: { create: { fieldId: string; value: string }[] };
  };
}

const create = vi.fn(async (args: CreateArgs) => ({ id: 'resp1' }));
const findUnique = vi.fn(async () => form);

vi.mock('@/lib/prisma', () => ({
  prisma: { form: { findUnique }, response: { create } },
}));

const { POST } = await import('./route');
const { resetRateLimits } = await import('@/lib/rate-limit');

function request(body: unknown, ip = '8.8.8.8') {
  return new Request('http://x/api/forms/public/my-form/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as never;
}

const params = Promise.resolve({ slug: 'my-form' });

function withRules(rules: LogicRule[]) {
  findUnique.mockResolvedValueOnce({ ...form, logicRules: rules } as never);
}

describe('public submit with conditional logic', () => {
  beforeEach(() => {
    resetRateLimits();
    create.mockClear();
    process.env.SUBMIT_RATE_LIMIT_MAX = '50';
    findUnique.mockImplementation(async () => form);
  });

  it('stores the target when its condition matches', async () => {
    withRules([showDogName]);
    const res = await POST(request({ fieldValues: { a: 'yes', b: 'Rex' } }), { params });
    expect(res.status).toBe(200);
    expect(create.mock.calls[0]![0].data.values.create).toEqual([
      { fieldId: 'a', value: 'yes' },
      { fieldId: 'b', value: 'Rex' },
    ]);
  });

  it('does not block submission when a hidden required field is unanswered', async () => {
    withRules([showDogName]);
    const res = await POST(request({ fieldValues: { a: 'no' } }), { params });
    expect(res.status).toBe(200);
    expect(create.mock.calls[0]![0].data.values.create).toEqual([{ fieldId: 'a', value: 'no' }]);
  });

  it('discards a hidden field value the client sent anyway', async () => {
    withRules([showDogName]);
    const res = await POST(request({ fieldValues: { a: 'no', b: 'Sneaky' } }), { params });
    expect(res.status).toBe(200);
    const stored = create.mock.calls[0]![0].data.values.create;
    expect(stored.map((v) => v.fieldId)).toEqual(['a']);
  });

  it('still enforces required on the target once it is visible', async () => {
    withRules([showDogName]);
    const res = await POST(request({ fieldValues: { a: 'yes' } }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors.b).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unknown field id even when it is hidden by a rule', async () => {
    withRules([showDogName]);
    const res = await POST(
      request({ fieldValues: { a: 'no', notAField: 'x' } }),
      { params }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.notAField).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an invalid option for a visible choice field', async () => {
    findUnique.mockResolvedValueOnce({
      ...form,
      logicRules: [],
      fields: [
        { id: 'a', type: 'multiple_choice', label: 'Pick', placeholder: null, required: false, options: ['One', 'Two'], validation: null, order: 0 },
      ],
    } as never);
    const res = await POST(request({ fieldValues: { a: 'Three' } }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('treats a form with no rules exactly as before', async () => {
    // Both fields required, no logic: the missing one still fails.
    const res = await POST(request({ fieldValues: { a: 'no' } }), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.b).toBeTruthy();
  });

  it('ignores a disabled rule, so the required field is enforced again', async () => {
    withRules([{ ...showDogName, enabled: false }]);
    const res = await POST(request({ fieldValues: { a: 'no' } }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('cannot be bypassed by claiming a hide rule should not apply', async () => {
    // The client sends 'yes' to reveal b, but omits it. Still enforced.
    withRules([showDogName]);
    const res = await POST(request({ fieldValues: { a: 'yes' } }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not let a dangling rule hide an unrelated field', async () => {
    withRules([{ ...showDogName, fieldId: 'deleted_field' }]);
    const res = await POST(request({ fieldValues: { a: 'no' } }), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.b).toBeTruthy();
  });
});
