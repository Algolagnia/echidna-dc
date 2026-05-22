import { describe, expect, it } from 'vitest';
import { MessageActivityCollector } from '../src/discord/MessageActivityCollector.js';

describe('MessageActivityCollector', () => {
  const make = (overrides = {}) =>
    new MessageActivityCollector({
      perUserGuildLimit: 5,
      maxTotalRecords: 10,
      ...overrides,
    });

  it('records and aggregates messages', () => {
    const c = make();
    for (let i = 0; i < 3; i++) {
      c.record('u1', 'g1', {
        channelId: 'c1',
        channelName: 'general',
        at: new Date(2025, 0, i + 1),
        contentPreview: `msg ${i}`,
      });
    }
    const stats = c.getStats('u1', 'g1');
    expect(stats.totalCount).toBe(3);
    expect(stats.uniqueChannels).toBe(1);
    expect(stats.perChannel[0]?.count).toBe(3);
    expect(stats.recentSamples.length).toBe(3);
  });

  it('respects per-user-guild ring buffer cap', () => {
    const c = make({ perUserGuildLimit: 3 });
    for (let i = 0; i < 7; i++) {
      c.record('u1', 'g1', {
        channelId: 'c1',
        channelName: 'general',
        at: new Date(2025, 0, i + 1),
        contentPreview: `msg ${i}`,
      });
    }
    const stats = c.getStats('u1', 'g1');
    expect(stats.totalCount).toBe(3);
    // last 3 messages survive
    expect(stats.recentSamples[0]?.contentPreview).toBe('msg 6');
  });

  it('evicts LRU users when total cap exceeded', () => {
    const c = make({ perUserGuildLimit: 5, maxTotalRecords: 8 });
    // Fill u1 with 5 records
    for (let i = 0; i < 5; i++) {
      c.record('u1', 'g1', {
        channelId: 'c1',
        channelName: 'general',
        at: new Date(),
        contentPreview: '',
      });
    }
    // u2 with 5 records → total goes 5+5=10 > 8 → u1 evicted
    for (let i = 0; i < 5; i++) {
      c.record('u2', 'g1', {
        channelId: 'c1',
        channelName: 'general',
        at: new Date(),
        contentPreview: '',
      });
    }
    expect(c.hasUser('u1')).toBe(false);
    expect(c.hasUser('u2')).toBe(true);
    expect(c.size().totalRecords).toBe(5);
  });

  it('returns empty stats for unknown user', () => {
    const c = make();
    const stats = c.getStats('ghost', 'g1');
    expect(stats.totalCount).toBe(0);
    expect(stats.perChannel).toEqual([]);
  });
});
