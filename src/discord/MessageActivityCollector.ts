import type { MessageActivityStats } from '../types/domain.js';
import { computeMessageStats } from './messageStats.js';

export interface RawMessageRecord {
  channelId: string;
  channelName: string;
  at: Date;
  contentPreview: string;
}

type InternalEntry = RawMessageRecord;

export interface MessageCollectorConfig {
  perUserGuildLimit: number;  // ring buffer size per (user, guild)
  maxTotalRecords: number;    // hard cap across all users
}

/**
 * RAM-only ring buffer cache for messages seen by the self-bot over the gateway.
 * - No disk writes.
 * - LRU eviction of entire (user, guild) buffers when over total cap.
 * - On process restart, cache is empty.
 */
export class MessageActivityCollector {
  private readonly store = new Map<string, Map<string, InternalEntry[]>>();
  // LRU order: most recently touched user IDs at the end
  private readonly lru: string[] = [];
  private totalRecords = 0;

  constructor(private readonly config: MessageCollectorConfig) {}

  record(userId: string, guildId: string, msg: RawMessageRecord): void {
    let guildMap = this.store.get(userId);
    if (!guildMap) {
      guildMap = new Map();
      this.store.set(userId, guildMap);
    }
    let buffer = guildMap.get(guildId);
    if (!buffer) {
      buffer = [];
      guildMap.set(guildId, buffer);
    }
    buffer.push(msg);
    this.totalRecords++;

    // ring buffer cap per (user, guild)
    while (buffer.length > this.config.perUserGuildLimit) {
      buffer.shift();
      this.totalRecords--;
    }

    this.touchLru(userId);
    this.evictIfOverCap();
  }

  getStats(userId: string, guildId: string): MessageActivityStats {
    return computeMessageStats(this.getRawRecords(userId, guildId));
  }

  /**
   * Returns the live-cached records (no copy). Callers must not mutate.
   * Used by the lookup strategy to merge with search-API results before computing stats.
   */
  getRawRecords(userId: string, guildId: string): readonly RawMessageRecord[] {
    return this.store.get(userId)?.get(guildId) ?? [];
  }

  hasUser(userId: string): boolean {
    return this.store.has(userId);
  }

  size(): { users: number; totalRecords: number } {
    return { users: this.store.size, totalRecords: this.totalRecords };
  }

  private touchLru(userId: string): void {
    const i = this.lru.indexOf(userId);
    if (i !== -1) this.lru.splice(i, 1);
    this.lru.push(userId);
  }

  private evictIfOverCap(): void {
    while (this.totalRecords > this.config.maxTotalRecords && this.lru.length > 0) {
      const victim = this.lru.shift();
      if (!victim) break;
      const guildMap = this.store.get(victim);
      if (!guildMap) continue;
      let removed = 0;
      for (const buf of guildMap.values()) removed += buf.length;
      this.store.delete(victim);
      this.totalRecords -= removed;
    }
  }
}
