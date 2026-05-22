import type { Clock } from './Clock.js';

export interface RateLimitConfig {
  capacity: number;
  refillPerMs: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly configs: Record<string, RateLimitConfig>,
    private readonly clock: Clock,
  ) {}

  check(scope: string): RateLimitDecision {
    const config = this.configs[scope];
    if (!config) {
      return { allowed: true, retryAfterMs: 0 };
    }
    const now = this.clock.now();
    const bucket = this.buckets.get(scope) ?? { tokens: config.capacity, lastRefill: now };

    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsed * config.refillPerMs);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(scope, bucket);
      return { allowed: true, retryAfterMs: 0 };
    }

    const missing = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil(missing / config.refillPerMs);
    this.buckets.set(scope, bucket);
    return { allowed: false, retryAfterMs };
  }

  static fromPerMinute(perMin: number): RateLimitConfig {
    return {
      capacity: Math.max(1, Math.ceil(perMin)),
      refillPerMs: perMin / 60_000,
    };
  }
}
