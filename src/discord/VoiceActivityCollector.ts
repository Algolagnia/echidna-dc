import type {
  ChannelVoiceStat,
  VoiceActivityStats,
  VoiceSessionEntry,
} from '../types/domain.js';

export interface VoiceStateChange {
  userId: string;
  guildId: string;
  oldChannelId: string | null;
  oldChannelName: string | null;
  newChannelId: string | null;
  newChannelName: string | null;
  at: Date;
}

interface ActiveSession {
  channelId: string;
  channelName: string;
  joinedAt: Date;
}

interface CompletedSession {
  channelId: string;
  channelName: string;
  joinedAt: Date;
  leftAt: Date;
  durationSeconds: number;
}

export interface VoiceCollectorConfig {
  perUserGuildSessionLimit: number;
  maxTotalSessions: number;
}

/**
 * RAM-only voice session tracker.
 * Listens to voiceStateUpdate events and computes per-user, per-guild voice activity.
 * No disk writes; cleared on restart.
 */
export class VoiceActivityCollector {
  // userId -> guildId -> completed sessions (ring)
  private readonly history = new Map<string, Map<string, CompletedSession[]>>();
  // userId -> guildId -> active session (only one per guild)
  private readonly active = new Map<string, Map<string, ActiveSession>>();
  private readonly lru: string[] = [];
  private totalSessions = 0;

  constructor(private readonly config: VoiceCollectorConfig) {}

  handleChange(change: VoiceStateChange): void {
    const { userId, guildId, oldChannelId, newChannelId, newChannelName, at } = change;

    // user left their previous channel (or moved)
    if (oldChannelId && oldChannelId !== newChannelId) {
      this.closeActive(userId, guildId, at);
    }

    // user joined a new channel (or moved into one)
    if (newChannelId && newChannelId !== oldChannelId && newChannelName) {
      this.openActive(userId, guildId, {
        channelId: newChannelId,
        channelName: newChannelName,
        joinedAt: at,
      });
    }
  }

  /**
   * Seed currently-online voice states at startup (so we don't lose context
   * for users already in voice when the self-bot connects).
   */
  seedActive(userId: string, guildId: string, session: ActiveSession): void {
    this.openActive(userId, guildId, session);
  }

  getStats(userId: string, guildId: string, now: Date = new Date()): VoiceActivityStats {
    const completed = this.history.get(userId)?.get(guildId) ?? [];
    const active = this.active.get(userId)?.get(guildId) ?? null;

    const perChannel = new Map<string, ChannelVoiceStat>();
    let totalSeconds = 0;
    let longest = 0;
    for (const s of completed) {
      totalSeconds += s.durationSeconds;
      if (s.durationSeconds > longest) longest = s.durationSeconds;
      const existing = perChannel.get(s.channelId);
      if (existing) {
        existing.totalSeconds += s.durationSeconds;
        existing.sessionCount++;
      } else {
        perChannel.set(s.channelId, {
          channelId: s.channelId,
          channelName: s.channelName,
          totalSeconds: s.durationSeconds,
          sessionCount: 1,
        });
      }
    }

    let currentSession: VoiceActivityStats['currentSession'] = null;
    if (active) {
      const dur = Math.floor((now.getTime() - active.joinedAt.getTime()) / 1000);
      currentSession = {
        channelName: active.channelName,
        joinedAt: active.joinedAt,
        durationSeconds: Math.max(0, dur),
      };
      if (dur > longest) longest = dur;
      totalSeconds += dur;
      const existing = perChannel.get(active.channelId);
      if (existing) {
        existing.totalSeconds += dur;
      } else {
        perChannel.set(active.channelId, {
          channelId: active.channelId,
          channelName: active.channelName,
          totalSeconds: dur,
          sessionCount: 0,
        });
      }
    }

    const recentSessions: VoiceSessionEntry[] = completed
      .slice(-10)
      .map((s) => ({
        channelId: s.channelId,
        channelName: s.channelName,
        joinedAt: s.joinedAt,
        leftAt: s.leftAt,
        durationSeconds: s.durationSeconds,
      }))
      .reverse();

    return {
      totalSeconds,
      sessionCount: completed.length + (active ? 1 : 0),
      longestSessionSeconds: longest,
      perChannel: Array.from(perChannel.values()).sort(
        (a, b) => b.totalSeconds - a.totalSeconds,
      ),
      currentSession,
      recentSessions,
    };
  }

  size(): { users: number; activeSessions: number; totalSessions: number } {
    let activeCount = 0;
    for (const map of this.active.values()) activeCount += map.size;
    return {
      users: this.history.size + this.active.size,
      activeSessions: activeCount,
      totalSessions: this.totalSessions,
    };
  }

  private openActive(userId: string, guildId: string, session: ActiveSession): void {
    let map = this.active.get(userId);
    if (!map) {
      map = new Map();
      this.active.set(userId, map);
    }
    map.set(guildId, session);
    this.touchLru(userId);
  }

  private closeActive(userId: string, guildId: string, at: Date): void {
    const activeMap = this.active.get(userId);
    if (!activeMap) return;
    const active = activeMap.get(guildId);
    if (!active) return;
    activeMap.delete(guildId);
    if (activeMap.size === 0) this.active.delete(userId);

    const duration = Math.max(0, Math.floor((at.getTime() - active.joinedAt.getTime()) / 1000));
    const completed: CompletedSession = {
      channelId: active.channelId,
      channelName: active.channelName,
      joinedAt: active.joinedAt,
      leftAt: at,
      durationSeconds: duration,
    };

    let userHist = this.history.get(userId);
    if (!userHist) {
      userHist = new Map();
      this.history.set(userId, userHist);
    }
    let buf = userHist.get(guildId);
    if (!buf) {
      buf = [];
      userHist.set(guildId, buf);
    }
    buf.push(completed);
    this.totalSessions++;

    while (buf.length > this.config.perUserGuildSessionLimit) {
      buf.shift();
      this.totalSessions--;
    }
    this.touchLru(userId);
    this.evictIfOverCap();
  }

  private touchLru(userId: string): void {
    const i = this.lru.indexOf(userId);
    if (i !== -1) this.lru.splice(i, 1);
    this.lru.push(userId);
  }

  private evictIfOverCap(): void {
    while (this.totalSessions > this.config.maxTotalSessions && this.lru.length > 0) {
      const victim = this.lru.shift();
      if (!victim) break;
      const userHist = this.history.get(victim);
      if (!userHist) continue;
      let removed = 0;
      for (const buf of userHist.values()) removed += buf.length;
      this.history.delete(victim);
      this.totalSessions -= removed;
    }
  }
}
