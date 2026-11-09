/**
 * A small fixed-window rate limiter, kept in memory.
 * It protects a single process. Behind a load balancer, limit at the proxy instead.
 * @param {{ limit: number, windowMs: number, now?: () => number }} options
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map();
  return {
    /**
     * Count one request for `key` and say whether it is allowed.
     * @param {string} key
     */
    check(key) {
      const time = now();
      if (hits.size > 5000) for (const [stored, entry] of hits) if (entry.resetAt <= time) hits.delete(stored);
      if (hits.size > 50_000) hits.clear();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= time) {
        entry = { count: 0, resetAt: time + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= limit,
        limit,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)),
      };
    },
  };
}
