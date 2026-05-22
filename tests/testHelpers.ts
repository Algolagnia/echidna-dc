import type { LookupReport } from '../src/lookup/LookupReport.js';

/** Build a minimal valid LookupReport for tests. Override any field via partial. */
export function makeReport(overrides: Partial<LookupReport> = {}): LookupReport {
  return {
    user: {
      id: '175928847299117063',
      username: 'testuser',
      globalName: 'TestUser',
      avatarUrl: null,
      isBot: false,
      createdAt: new Date('2016-04-30T11:18:25.796Z'),
      ageDays: 3000,
    },
    memberships: [],
    activity: [],
    profileExtras: null,
    mutualGuildCount: 0,
    durationMs: 100,
    fetchedAt: new Date('2026-05-19T12:00:00Z'),
    fromCache: true,
    risk: {
      flags: [],
      totalFlagged: 0,
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      lowSeverityCount: 0,
    },
    behavioral: {
      language: { primary: 'unknown', distribution: [], sampleSize: 0 },
      age: { estimate: null, confidence: 'low', evidence: [] },
      gender: { estimate: 'unknown', confidence: 'low', evidence: [] },
      tone: {
        overall: 'unknown',
        profanityRate: 0,
        capsRate: 0,
        emojiRate: 0,
        sampleSize: 0,
      },
    },
    confidence: { score: 0, band: 'low', factors: [] },
    ...overrides,
  };
}
