// ponytail: in-process fixed-window counter. Resets on redeploy and is not shared
// across instances — swap for Redis/Upstash if this ever runs multi-instance.
const hits = new Map<string, { count: number; resetAt: number }>();

function config() {
  return {
    max: Number(process.env.SUBMIT_RATE_LIMIT_MAX ?? 10),
    windowMs: Number(process.env.SUBMIT_RATE_LIMIT_WINDOW_MS ?? 60_000),
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export function checkRateLimit(
  key: string,
  policy?: { max?: number; windowMs?: number }
): { allowed: boolean; remaining: number; retryAfter: number } {
  // Spreading undefined is a no-op, so zero-arg calls behave exactly as before.
  const { max, windowMs } = { ...config(), ...policy };
  const now = Date.now();

  for (const [k, v] of hits) {
    if (v.resetAt <= now) hits.delete(k);
  }

  const hit = hits.get(key);
  if (!hit) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }

  hit.count += 1;
  return {
    allowed: hit.count <= max,
    remaining: Math.max(0, max - hit.count),
    retryAfter: Math.ceil((hit.resetAt - now) / 1000),
  };
}

export function resetRateLimits(): void {
  hits.clear();
}
