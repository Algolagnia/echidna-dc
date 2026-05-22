import type {
  ChannelMessageStat,
  MessageActivityStats,
  MessageSampleEntry,
} from '../types/domain.js';
import type { RawMessageRecord } from './MessageActivityCollector.js';

export function computeMessageStats(
  records: ReadonlyArray<RawMessageRecord>,
  discordTotalDiscoverable: number | null = null,
): MessageActivityStats {
  if (records.length === 0) {
    return {
      totalCount: 0,
      firstSeenAt: null,
      lastSeenAt: null,
      uniqueChannels: 0,
      perChannel: [],
      recentSamples: [],
      discordTotalDiscoverable,
    };
  }
  const perChannel = new Map<string, ChannelMessageStat>();
  let first = records[0]!.at;
  let last = records[0]!.at;
  for (const e of records) {
    if (e.at < first) first = e.at;
    if (e.at > last) last = e.at;
    const existing = perChannel.get(e.channelId);
    if (existing) {
      existing.count++;
      if (e.at > existing.lastAt) existing.lastAt = e.at;
    } else {
      perChannel.set(e.channelId, {
        channelId: e.channelId,
        channelName: e.channelName,
        count: 1,
        lastAt: e.at,
      });
    }
  }
  // All captured records become samples (newest first). The activity HTML
  // is the only consumer and it scrolls within the section.
  const sorted = [...records].sort((a, b) => b.at.getTime() - a.at.getTime());
  const samples: MessageSampleEntry[] = sorted.map((e) => ({
    channelId: e.channelId,
    channelName: e.channelName,
    at: e.at,
    contentPreview: e.contentPreview,
  }));
  return {
    totalCount: records.length,
    firstSeenAt: first,
    lastSeenAt: last,
    uniqueChannels: perChannel.size,
    perChannel: Array.from(perChannel.values()).sort((a, b) => b.count - a.count),
    recentSamples: samples,
    discordTotalDiscoverable,
  };
}

/**
 * Merge two arrays of message records, deduplicating by (channelId + timestamp + contentPreview).
 * Stable: records from `primary` win on duplicate, `secondary` fills gaps.
 */
export function mergeRecords(
  primary: ReadonlyArray<RawMessageRecord>,
  secondary: ReadonlyArray<RawMessageRecord>,
): RawMessageRecord[] {
  const seen = new Set<string>();
  const out: RawMessageRecord[] = [];
  const key = (r: RawMessageRecord): string =>
    `${r.channelId}|${r.at.getTime()}|${r.contentPreview.slice(0, 32)}`;
  for (const r of primary) {
    const k = key(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  for (const r of secondary) {
    const k = key(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}
