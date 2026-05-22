import type { GuildMember, User } from 'discord.js-selfbot-v13';
import type { DiscordClient } from './DiscordClient.js';
import { PresenceObserver } from './PresenceObserver.js';
import { SnowflakeDecoder } from './SnowflakeDecoder.js';
import type {
  DiscordUserSnapshot,
  GuildMembershipSnapshot,
} from '../types/domain.js';

export interface ScanResult {
  user: DiscordUserSnapshot;
  memberships: GuildMembershipSnapshot[];
}

export class GuildScanner {
  constructor(
    private readonly discord: DiscordClient,
    private readonly presence: PresenceObserver = new PresenceObserver(),
  ) {}

  scan(userId: string): ScanResult | null {
    const client = this.discord.getRawClient();
    const memberships: GuildMembershipSnapshot[] = [];
    let firstMember: GuildMember | null = null;

    for (const guild of client.guilds.cache.values()) {
      const member = guild.members.cache.get(userId);
      if (!member) continue;
      if (!firstMember) firstMember = member;
      memberships.push(this.membershipOf(member));
    }

    if (!firstMember) return null;

    return {
      user: this.userSnapshotOf(firstMember.user),
      memberships,
    };
  }

  userSnapshotOf(user: User): DiscordUserSnapshot {
    const decoded = SnowflakeDecoder.decode(user.id);
    return {
      id: user.id,
      username: user.username,
      globalName: (user as User & { globalName?: string | null }).globalName ?? null,
      avatarUrl: user.displayAvatarURL({ size: 256 }),
      isBot: user.bot,
      createdAt: decoded.createdAt,
      ageDays: Math.floor(decoded.ageMs / 86_400_000),
    };
  }

  private membershipOf(member: GuildMember): GuildMembershipSnapshot {
    return {
      guildId: member.guild.id,
      guildName: member.guild.name,
      nickname: member.nickname ?? null,
      joinedAt: member.joinedAt ?? null,
      premiumSince: member.premiumSince ?? null,
      roles: member.roles.cache
        .filter((r) => r.name !== '@everyone')
        .map((r) => r.name),
      voice: this.presence.voiceOf(member),
      activities: this.presence.activitiesOf(member),
      status: this.presence.statusOf(member),
    };
  }
}
