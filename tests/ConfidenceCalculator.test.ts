import { describe, expect, it } from 'vitest';
import { ConfidenceCalculator } from '../src/analysis/ConfidenceCalculator.js';
import type { GuildActivitySummary } from '../src/types/domain.js';

const emptyMessages = (
  overrides: Partial<GuildActivitySummary['messages']> = {},
): GuildActivitySummary['messages'] => ({
  totalCount: 0,
  firstSeenAt: null,
  lastSeenAt: null,
  uniqueChannels: 0,
  perChannel: [],
  recentSamples: [],
  discordTotalDiscoverable: null,
  ...overrides,
});

const emptyVoice = (): GuildActivitySummary['voice'] => ({
  totalSeconds: 0,
  sessionCount: 0,
  longestSessionSeconds: 0,
  perChannel: [],
  currentSession: null,
  recentSessions: [],
});

const activity = (
  overrides: Partial<GuildActivitySummary> = {},
): GuildActivitySummary => ({
  guildId: 'g',
  guildName: 'G',
  messages: emptyMessages(),
  voice: emptyVoice(),
  ...overrides,
});

describe('ConfidenceCalculator', () => {
  const c = new ConfidenceCalculator();

  it('low score for sparse signals', () => {
    const out = c.calculate({
      mutualGuildCount: 0,
      activity: [],
      profileExtras: null,
      accountAgeDays: 0,
    });
    expect(out.score).toBeLessThan(35);
    expect(out.band).toBe('low');
  });

  it('high score for rich signals', () => {
    const out = c.calculate({
      mutualGuildCount: 10,
      activity: [
        activity({
          messages: emptyMessages({
            totalCount: 1000,
            lastSeenAt: new Date(),
            discordTotalDiscoverable: 1000,
          }),
        }),
      ],
      profileExtras: {
        bio: 'hi',
        badges: ['Booster', 'HypeSquad'],
        premiumType: '2',
        connections: [{ type: 'github', name: 'me', verified: true }],
      },
      accountAgeDays: 365 * 4,
    });
    expect(out.score).toBeGreaterThan(60);
    expect(['high', 'very-high']).toContain(out.band);
  });

  it('penalizes stale activity', () => {
    const longAgo = new Date(Date.now() - 90 * 86400000);
    const out = c.calculate({
      mutualGuildCount: 5,
      activity: [
        activity({
          messages: emptyMessages({
            totalCount: 50,
            lastSeenAt: longAgo,
            discordTotalDiscoverable: 50,
          }),
        }),
      ],
      profileExtras: null,
      accountAgeDays: 365,
    });
    const recent = out.factors.find((f) => f.factor === 'recent_activity');
    expect(recent?.contribution).toBe(0);
  });

  it('caps each factor at its declared max', () => {
    const out = c.calculate({
      mutualGuildCount: 9999,
      activity: [
        activity({
          messages: emptyMessages({
            totalCount: 10_000_000,
            lastSeenAt: new Date(),
            discordTotalDiscoverable: 10_000_000,
          }),
        }),
      ],
      profileExtras: {
        bio: 'bio',
        badges: Array.from({ length: 100 }, (_, i) => `b${i}`),
        premiumType: '2',
        connections: Array.from({ length: 100 }, (_, i) => ({
          type: 't',
          name: `c${i}`,
          verified: true,
        })),
      },
      accountAgeDays: 365 * 99,
    });
    for (const f of out.factors) {
      expect(f.contribution).toBeLessThanOrEqual(f.max);
    }
    expect(out.score).toBeLessThanOrEqual(100);
  });
});
