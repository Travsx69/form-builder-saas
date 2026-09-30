import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimits, clientIp } from './rate-limit';

describe('rate limit', () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.SUBMIT_RATE_LIMIT_MAX = '3';
  });

  afterEach(() => {
    delete process.env.SUBMIT_RATE_LIMIT_MAX;
    resetRateLimits();
  });

  it('allows requests within the limit', () => {
    expect(checkRateLimit('a').allowed).toBe(true);
    expect(checkRateLimit('a').allowed).toBe(true);
    expect(checkRateLimit('a').allowed).toBe(true);
  });

  it('blocks requests exceeding the limit and reports Retry-After', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a');
    const blocked = checkRateLimit('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('scopes limits per key', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a');
    expect(checkRateLimit('b').allowed).toBe(true);
  });

  it('allows again once the window has passed', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) checkRateLimit('a');
    expect(checkRateLimit('a').allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit('a').allowed).toBe(true);
    vi.useRealTimers();
  });
});

describe('clientIp', () => {
  it('uses the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } });
    expect(clientIp(req)).toBe('1.1.1.1');
  });

  it('falls back to unknown', () => {
    expect(clientIp(new Request('http://x'))).toBe('unknown');
  });
});
