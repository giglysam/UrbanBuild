/**
 * In-memory rate limit stub (per server instance). Swap for Redis/Upstash in production.
 * Returns `true` if the key is within limit.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = hits.get(key)?.filter((t) => t > windowStart) ?? [];
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
