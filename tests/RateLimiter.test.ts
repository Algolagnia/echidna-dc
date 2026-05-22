import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/core/RateLimiter.js';
import { FakeClock } from '../src/core/Clock.js';

describe('RateLimiter', () => {
  it('allows requests up to capacity then denies', () => {
    const clock = new FakeClock(0);
    const limiter = new RateLimiter(
      { fast: { capacity: 3, refillPerMs: 0 } },
      clock,
    );
    expect(limiter.check('fast').allowed).toBe(true);
    expect(limiter.check('fast').allowed).toBe(true);
    expect(limiter.check('fast').allowed).toBe(true);
    expect(limiter.check('fast').allowed).toBe(false);
  });

  it('refills tokens over time', () => {
    const clock = new FakeClock(0);
    const limiter = new RateLimiter(
      { deep: RateLimiter.fromPerMinute(6) },
      clock,
    );
    for (let i = 0; i < 6; i++) {
      expect(limiter.check('deep').allowed).toBe(true);
    }
    expect(limiter.check('deep').allowed).toBe(false);
    clock.advance(10_000);
    expect(limiter.check('deep').allowed).toBe(true);
  });

  it('returns retryAfterMs when denied', () => {
    const clock = new FakeClock(0);
    const limiter = new RateLimiter(
      { fast: RateLimiter.fromPerMinute(60) },
      clock,
    );
    for (let i = 0; i < 60; i++) {
      limiter.check('fast');
    }
    const decision = limiter.check('fast');
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBeGreaterThan(0);
    expect(decision.retryAfterMs).toBeLessThanOrEqual(1000);
  });

  it('passes unknown scopes through', () => {
    const limiter = new RateLimiter({}, new FakeClock(0));
    expect(limiter.check('unknown').allowed).toBe(true);
  });
});
