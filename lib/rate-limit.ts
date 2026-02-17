interface Bucket {
  count: number;
  resetAt: number;
}

const bucketStore = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = bucketStore.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucketStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
