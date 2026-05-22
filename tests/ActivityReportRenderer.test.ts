import { describe, expect, it } from 'vitest';
import { ActivityReportRenderer } from '../src/report/ActivityReportRenderer.js';
import { makeReport } from './testHelpers.js';

const baseReport = makeReport;

describe('ActivityReportRenderer', () => {
  const r = new ActivityReportRenderer();

  it('renders a valid bilingual HTML document', () => {
    const out = r.render(baseReport());
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out).toContain('activity report');
    expect(out).toContain('aktivite raporu');
    expect(out).toContain('data-lang="tr"');
    expect(out).toContain('data-lang="en"');
  });

  it('renders empty-state for live voice when no voice membership', () => {
    const out = r.render(baseReport());
    expect(out.match(/not in any voice channel|hiçbir sunucuda ses/)).not.toBeNull();
  });

  it('renders live voice prominently when present', () => {
    const out = r.render(
      baseReport({
        mutualGuildCount: 1,
        memberships: [
          {
            guildId: 'g1',
            guildName: 'Gece',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: {
              channelName: 'Lounge',
              selfMute: false,
              selfDeaf: false,
              serverMute: false,
              serverDeaf: false,
              streaming: true,
              video: false,
            },
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: 'g1',
            guildName: 'Gece',
            messages: {
              totalCount: 0,
              firstSeenAt: null,
              lastSeenAt: null,
              uniqueChannels: 0,
              perChannel: [],
              recentSamples: [],
            },
            voice: {
              totalSeconds: 600,
              sessionCount: 1,
              longestSessionSeconds: 600,
              perChannel: [],
              currentSession: {
                channelName: 'Lounge',
                joinedAt: new Date(),
                durationSeconds: 600,
              },
              recentSessions: [],
            },
          },
        ],
      }),
    );
    expect(out).toContain('Lounge');
    expect(out).toContain('Gece');
    expect(out).toContain('voice-now');
  });

  it('lists per-guild messages with full samples', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Test',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: ['Member'],
            voice: null,
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: '1',
            guildName: 'Test',
            messages: {
              totalCount: 2,
              firstSeenAt: new Date('2026-01-01T10:00:00Z'),
              lastSeenAt: new Date('2026-01-02T10:00:00Z'),
              uniqueChannels: 1,
              perChannel: [
                {
                  channelId: 'c1',
                  channelName: 'general',
                  count: 2,
                  lastAt: new Date('2026-01-02T10:00:00Z'),
                },
              ],
              recentSamples: [
                {
                  channelId: 'c1',
                  channelName: 'general',
                  at: new Date('2026-01-02T10:00:00Z'),
                  contentPreview: 'second message',
                },
                {
                  channelId: 'c1',
                  channelName: 'general',
                  at: new Date('2026-01-01T10:00:00Z'),
                  contentPreview: 'first message',
                },
              ],
            },
            voice: {
              totalSeconds: 0,
              sessionCount: 0,
              longestSessionSeconds: 0,
              perChannel: [],
              currentSession: null,
              recentSessions: [],
            },
          },
        ],
      }),
    );
    expect(out).toContain('second message');
    expect(out).toContain('first message');
    expect(out).toContain('general');
  });

  it('uses the soft dark palette (GitHub-dark inspired, warm tan accent)', () => {
    const out = r.render(baseReport());
    expect(out).toContain('#0d1117');
    expect(out).toContain('#161b22');
    expect(out).toContain('#d2a679');
    expect(out).not.toContain('#d97757'); // old vivid orange
    expect(out).not.toContain('#7fd17f'); // old green
    expect(out).not.toContain('#fafaf9'); // light theme
  });

  it('omits voice summary and per-guild voice panels (keeps only live state)', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Test',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: '1',
            guildName: 'Test',
            messages: {
              totalCount: 0,
              firstSeenAt: null,
              lastSeenAt: null,
              uniqueChannels: 0,
              perChannel: [],
              recentSamples: [],
            },
            voice: {
              totalSeconds: 9999,
              sessionCount: 5,
              longestSessionSeconds: 1234,
              perChannel: [
                { channelId: 'v1', channelName: 'Lounge', totalSeconds: 9999, sessionCount: 5 },
              ],
              currentSession: null,
              recentSessions: [],
            },
          },
        ],
      }),
    );
    // No voice summary section
    expect(out).not.toMatch(/voice summary|ses özeti/);
    // No per-guild voice panel header
    expect(out).not.toMatch(/─ voice \(\d+ sessions\) ─|─ ses \(\d+ oturum\) ─/);
    // No "longest session" metric
    expect(out).not.toMatch(/longest session|en uzun oturum/);
    // The live voice state title must still be there
    expect(out).toMatch(/live voice state|canlı ses durumu/);
  });

  it('shows "showing N of M" truncation hint when Discord reports more', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Test',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: '1',
            guildName: 'Test',
            messages: {
              totalCount: 50,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
              uniqueChannels: 1,
              perChannel: [],
              recentSamples: [],
              discordTotalDiscoverable: 234,
            },
            voice: {
              totalSeconds: 0,
              sessionCount: 0,
              longestSessionSeconds: 0,
              perChannel: [],
              currentSession: null,
              recentSessions: [],
            },
          },
        ],
      }),
    );
    expect(out).toMatch(/showing 50 of 234|gösterilen 50/);
    expect(out).toContain('SEARCH_PAGES_PER_GUILD');
  });

  it('shows "all retrieved" hint when Discord total equals shown count', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Test',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: '1',
            guildName: 'Test',
            messages: {
              totalCount: 17,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
              uniqueChannels: 1,
              perChannel: [],
              recentSamples: [],
              discordTotalDiscoverable: 17,
            },
            voice: {
              totalSeconds: 0,
              sessionCount: 0,
              longestSessionSeconds: 0,
              perChannel: [],
              currentSession: null,
              recentSessions: [],
            },
          },
        ],
      }),
    );
    expect(out).toMatch(/all 17|tüm 17/);
  });

  it('renders ALL captured message samples, not just a slice', () => {
    const samples = Array.from({ length: 25 }, (_, i) => ({
      channelId: 'c1',
      channelName: 'general',
      at: new Date(2026, 0, 1, 12, 0, i),
      contentPreview: `msg-${i}`,
    }));
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Test',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: [],
            voice: null,
            activities: [],
            status: null,
          },
        ],
        activity: [
          {
            guildId: '1',
            guildName: 'Test',
            messages: {
              totalCount: 25,
              firstSeenAt: samples[0]!.at,
              lastSeenAt: samples[24]!.at,
              uniqueChannels: 1,
              perChannel: [
                {
                  channelId: 'c1',
                  channelName: 'general',
                  count: 25,
                  lastAt: samples[24]!.at,
                },
              ],
              recentSamples: samples,
            },
            voice: {
              totalSeconds: 0,
              sessionCount: 0,
              longestSessionSeconds: 0,
              perChannel: [],
              currentSession: null,
              recentSessions: [],
            },
          },
        ],
      }),
    );
    // every preview must appear
    for (let i = 0; i < 25; i++) {
      expect(out).toContain(`msg-${i}`);
    }
  });
});
