import { describe, expect, it } from 'vitest';
import { PatternDetector } from '../src/analysis/PatternDetector.js';

const rec = (content: string, at = new Date()) => ({
  channelId: 'c',
  channelName: 'general',
  at,
  contentPreview: content,
});

describe('PatternDetector', () => {
  const d = new PatternDetector();

  it('flags Discord Nitro scam', () => {
    const r = d.detectAll([
      { guildId: 'g', guildName: 'G', records: [rec('hey claim your free nitro here')] },
    ]);
    expect(r.totalFlagged).toBe(1);
    expect(r.flags[0]?.category).toBe('nitro-scam');
    expect(r.flags[0]?.severity).toBe('high');
    expect(r.highSeverityCount).toBe(1);
  });

  it('flags Steam phishing look-alikes', () => {
    const r = d.detectAll([
      {
        guildId: 'g',
        guildName: 'G',
        records: [rec('steamcommunity.ru/giftcard offers free skin')],
      },
    ]);
    expect(r.flags.some((f) => f.category === 'phishing-url')).toBe(true);
  });

  it('flags token grabber references', () => {
    const r = d.detectAll([
      { guildId: 'g', guildName: 'G', records: [rec('check out this token grabber repo')] },
    ]);
    expect(r.flags.some((f) => f.category === 'token-grabber')).toBe(true);
  });

  it('flags crypto giveaway scams', () => {
    const r = d.detectAll([
      { guildId: 'g', guildName: 'G', records: [rec('free btc airdrop claim now')] },
    ]);
    expect(r.flags.some((f) => f.category === 'crypto-scam')).toBe(true);
  });

  it('flags mass mention raids', () => {
    const r = d.detectAll([
      {
        guildId: 'g',
        guildName: 'G',
        records: [rec('<@1> <@2> <@3> <@4> <@5> <@6> join now')],
      },
    ]);
    expect(r.flags.some((f) => f.category === 'mass-mention')).toBe(true);
  });

  it('flags suspicious URL shorteners', () => {
    const r = d.detectAll([
      { guildId: 'g', guildName: 'G', records: [rec('come here bit.ly/abc123')] },
    ]);
    expect(r.flags.some((f) => f.category === 'suspicious-link')).toBe(true);
  });

  it('returns empty assessment for benign messages', () => {
    const r = d.detectAll([
      {
        guildId: 'g',
        guildName: 'G',
        records: [rec('aga ne yapıyosun bugün'), rec('sınav vardı kötü geçti')],
      },
    ]);
    expect(r.totalFlagged).toBe(0);
    expect(r.highSeverityCount).toBe(0);
  });

  it('sorts by severity desc then date desc', () => {
    const old = new Date(2025, 0, 1);
    const fresh = new Date(2026, 0, 1);
    const r = d.detectAll([
      {
        guildId: 'g',
        guildName: 'G',
        records: [
          rec('bit.ly/old-shortlink', old), // low
          rec('free nitro discord giveaway', fresh), // high
          rec('bit.ly/fresh', fresh), // low
        ],
      },
    ]);
    expect(r.flags[0]?.severity).toBe('high');
    // Among the two low-severity flags, the fresh one wins
    const lows = r.flags.filter((f) => f.severity === 'low');
    expect(lows[0]?.at.getTime()).toBe(fresh.getTime());
  });
});
