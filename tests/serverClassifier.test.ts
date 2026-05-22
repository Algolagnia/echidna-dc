import { describe, expect, it } from 'vitest';
import { classifyServer } from '../src/lookup/serverClassifier.js';

describe('classifyServer', () => {
  it('classifies anime-flavored servers', () => {
    expect(classifyServer('Tsuki Sohbet Anime')).toBe('anime');
    expect(classifyServer('Maina ヽ Manga')).toBe('anime');
    expect(classifyServer('Nekutai')).toBe('anime');
  });

  it('classifies chat/social servers', () => {
    expect(classifyServer('Sohbet & Oyun')).toBe('chat');
    expect(classifyServer('ADINI SEN KOY')).toBe('chat');
    expect(classifyServer('Crystal')).toBe('chat');
    expect(classifyServer('⋆ Gece ⋆')).toBe('chat');
  });

  it('classifies education', () => {
    expect(classifyServer('The English Hub')).toBe('education');
  });

  it('classifies dev/test servers', () => {
    expect(classifyServer('test server')).toBe('dev');
    expect(classifyServer('My Dev Group')).toBe('dev');
  });

  it('classifies gaming', () => {
    expect(classifyServer('Valorant TR')).toBe('gaming');
    expect(classifyServer('Minecraft Survival')).toBe('gaming');
  });

  it('falls back to community for unknowns', () => {
    expect(classifyServer('Random Place 42')).toBe('community');
  });

  it('flags adult content', () => {
    expect(classifyServer('18+ NSFW')).toBe('adult');
  });
});
