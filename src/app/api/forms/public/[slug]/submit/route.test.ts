import { describe, it, expect, vi, beforeEach } from 'vitest';

const form = {
  id: 'form1',
  isPublished: true,
  // No rules: these tests cover a form without conditional logic.
  logicRules: [],
  fields: [
    { id: 'f1', type: 'checkboxes', label: 'Interests', placeholder: null, required: false, options: ['Sales, Marketing', 'Support'], validation: null, order: 0 },
    { id: 'f2', type: 'short_text', label: 'Name', placeholder: null, required: true, options: null, validation: null, order: 1 },
  ],
};

interface CreateArgs {
  data: {
    formId: string;
    userId: string | null;
    values: { create: { fieldId: string; value: string }[] };
  };
}

const create = vi.fn(async (args: CreateArgs) => ({ id: `resp_${args.data.formId}` }));
const findUnique = vi.fn(async () => form);

vi.mock('@/lib/prisma', () => ({
  prisma: { form: { findUnique }, response: { create } },
}));

const { POST } = await import('./route');
const { resetRateLimits } = await import('@/lib/rate-limit');

function request(body: unknown, ip = '9.9.9.9') {
  return new Request('http://x/api/forms/public/my-form/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as never;
}

const params = Promise.resolve({ slug: 'my-form' });

describe('public submit route', () => {
  beforeEach(() => {
    resetRateLimits();
    create.mockClear();
    process.env.SUBMIT_RATE_LIMIT_MAX = '2';
  });

  it('stores a valid submission, JSON-encoding checkbox selections', async () => {
    const res = await POST(
      request({ fieldValues: { f1: ['Sales, Marketing'], f2: 'Ada' } }),
      { params }
    );
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledOnce();
    const values = create.mock.calls[0]![0].data.values.create;
    expect(values).toEqual(
      expect.arrayContaining([
        { fieldId: 'f1', value: '["Sales, Marketing"]' },
        { fieldId: 'f2', value: 'Ada' },
      ])
    );
  });

  it('still rejects invalid submissions with 400', async () => {
    const res = await POST(request({ fieldValues: { f2: '' } }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects unpublished forms with 403', async () => {
    findUnique.mockResolvedValueOnce({ ...form, isPublished: false } as never);
    const res = await POST(request({ fieldValues: { f2: 'Ada' } }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 429 once the per-IP limit is exceeded', async () => {
    expect((await POST(request({ fieldValues: { f2: 'Ada' } }), { params })).status).toBe(200);
    expect((await POST(request({ fieldValues: { f2: 'Ada' } }), { params })).status).toBe(200);
    const blocked = await POST(request({ fieldValues: { f2: 'Ada' } }), { params });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not rate limit a different IP', async () => {
    await POST(request({ fieldValues: { f2: 'Ada' } }, '1.1.1.1'), { params });
    await POST(request({ fieldValues: { f2: 'Ada' } }, '1.1.1.1'), { params });
    const res = await POST(request({ fieldValues: { f2: 'Ada' } }, '2.2.2.2'), { params });
    expect(res.status).toBe(200);
  });
});
