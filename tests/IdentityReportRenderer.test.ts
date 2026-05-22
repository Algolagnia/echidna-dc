import { describe, expect, it } from 'vitest';
import { IdentityReportRenderer } from '../src/report/IdentityReportRenderer.js';
import { makeReport } from './testHelpers.js';

const baseReport = makeReport;

describe('IdentityReportRenderer', () => {
  const r = new IdentityReportRenderer();

  it('renders a valid bilingual HTML document', () => {
    const out = r.render(baseReport());
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out).toContain('data-lang="tr"');
    expect(out).toContain('data-lang="en"');
    expect(out).toContain('lang-switch');
    expect(out).toContain('identity report');
    expect(out).toContain('kimlik raporu');
  });

  it('escapes user-controlled fields', () => {
    const out = r.render(
      baseReport({
        user: {
          ...baseReport().user,
          username: '<img src=x onerror=alert(1)>',
        },
      }),
    );
    expect(out).not.toContain('<img src=x');
    expect(out).toContain('&lt;img');
  });

  it('shows aliases when nicknames exist', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: 'g1',
            guildName: 'Test',
            nickname: 'Acmé',
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
    expect(out).toContain('Acmé');
    expect(out).toContain('testuser');
  });

  it('uses the soft dark palette (GitHub-dark inspired, warm tan accent)', () => {
    const out = r.render(baseReport());
    // soft dark base + warm tan accent
    expect(out).toContain('#0d1117'); // page bg
    expect(out).toContain('#161b22'); // panel bg
    expect(out).toContain('#d2a679'); // accent
    expect(out).toContain('#e6edf3'); // text
    // legacy palettes must be gone
    expect(out).not.toContain('#d97757'); // old vivid orange
    expect(out).not.toContain('#7fd17f'); // old green terminal
    expect(out).not.toContain('#fafaf9'); // light theme
  });

  it('classifies guilds and groups them', () => {
    const out = r.render(
      baseReport({
        memberships: [
          {
            guildId: '1',
            guildName: 'Tsuki Anime Server',
            nickname: null,
            joinedAt: null,
            premiumSince: null,
            roles: ['Member'],
            voice: null,
            activities: [],
            status: null,
          },
          {
            guildId: '2',
            guildName: 'Some Sohbet Place',
            nickname: null,
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
    // expect category labels somewhere
    expect(out.match(/Anime/)).not.toBeNull();
    expect(out.match(/Sohbet|Chat/)).not.toBeNull();
  });
});
