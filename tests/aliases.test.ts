import { describe, expect, it } from 'vitest';
import { deriveAliases } from '../src/lookup/aliases.js';
import type { LookupReport } from '../src/lookup/LookupReport.js';

const make = (overrides: Partial<LookupReport> = {}): LookupReport => ({
  user: {
    id: '1',
    username: 'testuser',
    globalName: 'TestUser',
    avatarUrl: null,
    isBot: false,
    createdAt: new Date(),
    ageDays: 0,
  },
  memberships: [],
  activity: [],
  profileExtras: null,
  mutualGuildCount: 0,
  durationMs: 0,
  fetchedAt: new Date(),
  fromCache: true,
  ...overrides,
});

describe('deriveAliases', () => {
  it('returns username + global_name when no nicks', () => {
    const a = deriveAliases(
      make({
        user: {
          id: '1',
          username: 'testuser',
          globalName: 'TestUser North',
          avatarUrl: null,
          isBot: false,
          createdAt: new Date(),
          ageDays: 0,
        },
      }),
    );
    expect(a.map((x) => x.value)).toEqual(['testuser', 'TestUser North']);
  });

  it('treats case-insensitive duplicates as one alias with multiple sources', () => {
    const a = deriveAliases(make()); // username 'testuser', globalName 'TestUser' — collapse
    expect(a.length).toBe(1);
    expect(a[0]?.sources).toContain('username');
    expect(a[0]?.sources).toContain('global_name');
  });

  it('adds per-guild nicknames as aliases', () => {
    const a = deriveAliases(
      make({
        memberships: [
          {
            guildId: '1',
            guildName: 'G1',
            nickname: 'TestUserNorth',
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
          {
            guildId: '2',
            guildName: 'G2',
            nickname: 'Mr. Linux',
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
      }),
    );
    expect(a.map((x) => x.value)).toContain('TestUserNorth');
    expect(a.map((x) => x.value)).toContain('Mr. Linux');
  });

  it('deduplicates case-insensitively across sources', () => {
    const a = deriveAliases(
      make({
        user: { ...make().user, globalName: 'TestUser' },
        memberships: [
          {
            guildId: '1',
            guildName: 'G1',
            nickname: 'testuser',
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
          {
            guildId: '2',
            guildName: 'G2',
            nickname: 'TESTUSER',
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
      }),
    );
    // 'testuser' from username merges with 'TESTUSER' & 'testuser' nicks, 'TestUser' globalname merges too
    const testuser = a.find((x) => x.value.toLowerCase() === 'testuser');
    expect(testuser).toBeDefined();
    expect(testuser!.sources.length).toBeGreaterThan(1);
  });
});
