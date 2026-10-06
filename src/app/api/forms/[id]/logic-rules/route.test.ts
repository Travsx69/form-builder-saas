import { describe, it, expect, vi, beforeEach } from 'vitest';

const form = {
  userId: 'user1',
  fields: [
    { id: 'a', type: 'yes_no' },
    { id: 'b', type: 'short_text' },
    { id: 'c', type: 'short_text' },
  ],
  logicRules: [] as { id: string; fieldId: string; targetField: string | null; enabled: boolean }[],
};

const create = vi.fn(async (args: unknown) => ({ id: 'rule_new', ...(args as object) }));
const findUnique = vi.fn(async () => form);

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'user1' } }) }));
vi.mock('@/lib/prisma', () => ({
  prisma: { form: { findUnique }, logicRule: { create } },
}));

const { POST } = await import('./route');

function request(body: unknown) {
  return new Request('http://x/api/forms/form1/logic-rules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

const params = Promise.resolve({ id: 'form1' });

const validRule = {
  sourceFieldId: 'a',
  operator: 'equals',
  value: 'yes',
  action: 'show',
  targetFieldId: 'b',
};

describe('create logic rule', () => {
  beforeEach(() => {
    create.mockClear();
    findUnique.mockImplementation(async () => form);
    form.logicRules = [];
  });

  it('creates a valid rule', async () => {
    const res = await POST(request(validRule), { params });
    expect(res.status).toBe(201);
    expect(create.mock.calls[0]![0]).toMatchObject({
      data: {
        formId: 'form1',
        fieldId: 'a',
        condition: 'equals',
        value: 'yes',
        action: 'show',
        targetField: 'b',
      },
    });
  });

  it('rejects an unknown source field', async () => {
    const res = await POST(request({ ...validRule, sourceFieldId: 'nope' }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unknown target field', async () => {
    const res = await POST(request({ ...validRule, targetFieldId: 'nope' }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a field controlling itself', async () => {
    const res = await POST(request({ ...validRule, targetFieldId: 'a' }), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('A field cannot control itself');
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a rule that would close a two-field cycle', async () => {
    // a -> b already exists, so b -> a closes the loop.
    form.logicRules = [{ id: 'r1', fieldId: 'a', targetField: 'b', enabled: true }];
    const res = await POST(
      request({ ...validRule, sourceFieldId: 'b', targetFieldId: 'a' }),
      { params }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/circular/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a rule that would close a longer cycle', async () => {
    form.logicRules = [
      { id: 'r1', fieldId: 'a', targetField: 'b', enabled: true },
      { id: 'r2', fieldId: 'b', targetField: 'c', enabled: true },
    ];
    const res = await POST(
      request({ ...validRule, sourceFieldId: 'c', targetFieldId: 'a' }),
      { params }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/circular/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('allows a rule that does not create a cycle', async () => {
    form.logicRules = [{ id: 'r1', fieldId: 'a', targetField: 'b', enabled: true }];
    const res = await POST(request({ ...validRule, targetFieldId: 'c' }), { params });
    expect(res.status).toBe(201);
  });

  it('rejects an unsupported operator', async () => {
    const res = await POST(request({ ...validRule, operator: 'matches_regex' }), { params });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a form owned by another user', async () => {
    findUnique.mockResolvedValueOnce({ ...form, userId: 'someone_else' } as never);
    const res = await POST(request(validRule), { params });
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 404 when the form does not exist', async () => {
    findUnique.mockResolvedValueOnce(null as never);
    const res = await POST(request(validRule), { params });
    expect(res.status).toBe(404);
  });
});
