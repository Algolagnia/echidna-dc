import type { GuildMember, VoiceState, Presence } from 'discord.js-selfbot-v13';
import type {
  ActivitySnapshot,
  VoiceStateSnapshot,
} from '../types/domain.js';

const ACTIVITY_TYPES: Record<number, string> = {
  0: 'Playing',
  1: 'Streaming',
  2: 'Listening',
  3: 'Watching',
  4: 'Custom',
  5: 'Competing',
};

export class PresenceObserver {
  voiceOf(member: GuildMember): VoiceStateSnapshot | null {
    const v: VoiceState | null = member.voice ?? null;
    if (!v || !v.channelId) return null;
    const channel = v.channel;
    const channelName =
      channel && 'name' in channel && typeof channel.name === 'string'
        ? channel.name
        : `#${v.channelId}`;
    return {
      channelName,
      selfMute: v.selfMute ?? false,
      selfDeaf: v.selfDeaf ?? false,
      serverMute: v.serverMute ?? false,
      serverDeaf: v.serverDeaf ?? false,
      streaming: v.streaming ?? false,
      video: v.selfVideo ?? false,
    };
  }

  activitiesOf(member: GuildMember): ActivitySnapshot[] {
    const presence: Presence | null = member.presence ?? null;
    if (!presence) return [];
    return presence.activities.map((a) => ({
      type: ACTIVITY_TYPES[a.type as unknown as number] ?? String(a.type),
      name: a.name,
      details: a.details ?? a.state ?? null,
    }));
  }

  statusOf(member: GuildMember): string | null {
    return member.presence?.status ?? null;
  }
}
