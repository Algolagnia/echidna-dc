import { describe, expect, it } from 'vitest';
import { VoiceActivityCollector } from '../src/discord/VoiceActivityCollector.js';

describe('VoiceActivityCollector', () => {
  const make = () =>
    new VoiceActivityCollector({
      perUserGuildSessionLimit: 10,
      maxTotalSessions: 100,
    });

  it('tracks join then leave as a completed session', () => {
    const c = make();
    c.handleChange({
      userId: 'u1',
      guildId: 'g1',
      oldChannelId: null,
      oldChannelName: null,
      newChannelId: 'vc1',
      newChannelName: 'General',
      at: new Date('2025-01-01T10:00:00Z'),
    });
    c.handleChange({
      userId: 'u1',
      guildId: 'g1',
      oldChannelId: 'vc1',
      oldChannelName: 'General',
      newChannelId: null,
      newChannelName: null,
      at: new Date('2025-01-01T10:30:00Z'),
    });
    const stats = c.getStats('u1', 'g1', new Date('2025-01-01T11:00:00Z'));
    expect(stats.sessionCount).toBe(1);
    expect(stats.totalSeconds).toBe(1800);
    expect(stats.currentSession).toBeNull();
    expect(stats.perChannel[0]?.channelName).toBe('General');
  });

  it('reports an active session with ongoing duration', () => {
    const c = make();
    c.handleChange({
      userId: 'u1',
      guildId: 'g1',
      oldChannelId: null,
      oldChannelName: null,
      newChannelId: 'vc1',
      newChannelName: 'Lounge',
      at: new Date('2025-01-01T10:00:00Z'),
    });
    const stats = c.getStats('u1', 'g1', new Date('2025-01-01T10:10:00Z'));
    expect(stats.sessionCount).toBe(1);
    expect(stats.totalSeconds).toBe(600);
    expect(stats.currentSession?.channelName).toBe('Lounge');
    expect(stats.currentSession?.durationSeconds).toBe(600);
  });

  it('handles channel moves correctly', () => {
    const c = make();
    c.handleChange({
      userId: 'u1',
      guildId: 'g1',
      oldChannelId: null,
      oldChannelName: null,
      newChannelId: 'a',
      newChannelName: 'A',
      at: new Date('2025-01-01T10:00:00Z'),
    });
    c.handleChange({
      userId: 'u1',
      guildId: 'g1',
      oldChannelId: 'a',
      oldChannelName: 'A',
      newChannelId: 'b',
      newChannelName: 'B',
      at: new Date('2025-01-01T10:15:00Z'),
    });
    const stats = c.getStats('u1', 'g1', new Date('2025-01-01T10:20:00Z'));
    expect(stats.sessionCount).toBe(2);
    expect(stats.currentSession?.channelName).toBe('B');
    expect(stats.perChannel.length).toBe(2);
  });

  it('returns empty stats for unknown user', () => {
    const c = make();
    const stats = c.getStats('ghost', 'g1');
    expect(stats.sessionCount).toBe(0);
    expect(stats.totalSeconds).toBe(0);
    expect(stats.currentSession).toBeNull();
  });
});
