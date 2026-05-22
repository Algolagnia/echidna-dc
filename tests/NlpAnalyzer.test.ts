import { describe, expect, it } from 'vitest';
import { NlpAnalyzer } from '../src/analysis/NlpAnalyzer.js';
import type { GuildMembershipSnapshot } from '../src/types/domain.js';

const rec = (content: string) => ({
  channelId: 'c',
  channelName: 'general',
  at: new Date(),
  contentPreview: content,
});

const membership = (name: string, roles: string[] = [], nickname: string | null = null): GuildMembershipSnapshot => ({
  guildId: 'g',
  guildName: name,
  nickname,
  joinedAt: null,
  premiumSince: null,
  roles,
  voice: null,
  activities: [],
  status: null,
});

describe('NlpAnalyzer', () => {
  const a = new NlpAnalyzer();

  // ─── Language ───
  it('detects Turkish from frequent words and special characters', () => {
    const out = a.analyze(
      [rec('aga ne yapıyosun valla çok güzel'), rec('bir bu kadar olur değil mi')],
      [],
      'testuser',
      null,
    );
    expect(out.language.primary).toBe('tr');
  });

  it('detects English from frequent words', () => {
    const out = a.analyze(
      [rec('hey what are you doing today'), rec('this is just amazing thanks')],
      [],
      'someone',
      null,
    );
    expect(out.language.primary).toBe('en');
  });

  it('returns unknown when sample is too small or empty', () => {
    const out = a.analyze([], [], 'x', null);
    expect(out.language.primary).toBe('unknown');
    expect(out.language.sampleSize).toBe(0);
  });

  // ─── Age ───
  it('extracts age from explicit self-mention', () => {
    const out = a.analyze(
      [rec('ben 19 yaşındayım abi')],
      [],
      'x',
      null,
    );
    expect(out.age.estimate).toBe(19);
    expect(out.age.confidence).toBe('high');
    expect(out.age.evidence.length).toBeGreaterThan(0);
  });

  it('extracts age from English self-mention', () => {
    const out = a.analyze(
      [rec("i'm 22 years old btw")],
      [],
      'x',
      null,
    );
    expect(out.age.estimate).toBe(22);
    expect(out.age.confidence).toBe('high');
  });

  it('falls back to nickname numerics with low confidence', () => {
    const out = a.analyze(
      [],
      [membership('G', [], 'TestUser 20')],
      'someuser',
      null,
    );
    expect(out.age.estimate).toBe(20);
    expect(out.age.confidence).toBe('low');
  });

  it('returns no age estimate when no evidence', () => {
    const out = a.analyze([rec('hello world')], [], 'someone', null);
    expect(out.age.estimate).toBeNull();
  });

  // ─── Gender ───
  it('extracts gender from explicit role tags (high confidence)', () => {
    const out = a.analyze(
      [],
      [membership('G', ['Erkek 🧑', 'random'])],
      'x',
      null,
    );
    expect(out.gender.estimate).toBe('male');
    expect(out.gender.confidence).toBe('high');
  });

  it('falls back to gender from self-mention', () => {
    const out = a.analyze(
      [rec('ben erkeğim aga'), rec('ben erkeğim demiştim')],
      [],
      'x',
      null,
    );
    expect(out.gender.estimate).toBe('male');
  });

  it('returns unknown gender when no signal', () => {
    const out = a.analyze([rec('hello there')], [], 'x', null);
    expect(out.gender.estimate).toBe('unknown');
  });

  // ─── Tone ───
  it('detects positive tone from positive vocabulary', () => {
    const out = a.analyze(
      [
        rec('teşekkür ederim çok güzel'),
        rec('harika bir gün süper'),
        rec('love this so much amazing'),
      ],
      [],
      'x',
      null,
    );
    expect(['positive', 'mixed']).toContain(out.tone.overall);
  });

  it('detects high caps rate', () => {
    const out = a.analyze(
      [rec('AAAAA NEDEN BAĞIRIYORUM'), rec('ALL CAPS MESSAGE')],
      [],
      'x',
      null,
    );
    expect(out.tone.capsRate).toBeGreaterThan(0.5);
  });

  it('detects profanity rate', () => {
    const out = a.analyze(
      [rec('aq nasıl olur'), rec('siktir git'), rec('normal bir mesaj')],
      [],
      'x',
      null,
    );
    expect(out.tone.profanityRate).toBeGreaterThan(0);
  });
});
