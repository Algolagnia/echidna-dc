import { describe, expect, it } from 'vitest';
import { MarkdownFormatter } from '../src/report/MarkdownFormatter.js';
import { makeReport } from './testHelpers.js';

const fakeReport = makeReport;

describe('MarkdownFormatter', () => {
  const formatter = new MarkdownFormatter();

  it('mentions both reports in the footer', () => {
    const out = formatter.format(fakeReport());
    expect(out).toContain('echidna · lookup report');
    expect(out).toContain('2 reports attached');
  });

  it('includes ALIASES block when nicknames or names exist', () => {
    const out = formatter.format(
      fakeReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'G',
            nickname: 'kuze',
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
    expect(out).toContain('ALIASES');
    expect(out).toContain('kuze');
  });

  it('shows LIVE VOICE when user is in a voice channel', () => {
    const out = formatter.format(
      fakeReport({
        memberships: [
          {
            guildId: '1',
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
              streaming: false,
              video: false,
            },
            activities: [],
            status: null,
          },
        ],
      }),
    );
    expect(out).toContain('LIVE VOICE');
    expect(out).toContain('Gece');
    expect(out).toContain('Lounge');
  });

  it('flags bot accounts', () => {
    const out = formatter.format(
      fakeReport({
        user: { ...fakeReport().user, isBot: true },
      }),
    );
    expect(out).toContain('BOT ACCOUNT');
  });
});
