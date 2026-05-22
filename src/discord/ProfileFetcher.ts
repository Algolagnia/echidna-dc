import type { User } from 'discord.js-selfbot-v13';
import type { DiscordClient } from './DiscordClient.js';
import type { RateLimiter } from '../core/RateLimiter.js';
import type { Logger } from '../core/Logger.js';
import {
  RateLimitedError,
  UserNotFoundError,
} from '../core/Errors.js';
import { GuildScanner } from './GuildScanner.js';
import type {
  ConnectionSnapshot,
  DiscordUserSnapshot,
  ProfileExtras,
} from '../types/domain.js';

export class ProfileFetcher {
  private readonly scanner: GuildScanner;
  constructor(
    private readonly discord: DiscordClient,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {
    this.scanner = new GuildScanner(discord);
  }

  async fetchUser(userId: string): Promise<DiscordUserSnapshot> {
    const decision = this.rateLimiter.check('deep');
    if (!decision.allowed) {
      throw new RateLimitedError(decision.retryAfterMs);
    }
    const client = this.discord.getRawClient();
    try {
      const user: User = await client.users.fetch(userId);
      return this.scanner.userSnapshotOf(user);
    } catch (err) {
      throw new UserNotFoundError(`user ${userId} not found`, err);
    }
  }

  async fetchProfileExtras(userId: string): Promise<ProfileExtras | null> {
    const decision = this.rateLimiter.check('deep');
    if (!decision.allowed) {
      throw new RateLimitedError(decision.retryAfterMs);
    }
    const client = this.discord.getRawClient();
    try {
      const user = await client.users.fetch(userId);
      const userWithProfile = user as User & {
        getProfile?: () => Promise<unknown>;
      };
      if (typeof userWithProfile.getProfile !== 'function') {
        this.logger.warn('profile_unavailable');
        return null;
      }
      const profile = (await userWithProfile.getProfile()) as {
        bio?: string;
        badges?: Array<{ id?: string; description?: string }>;
        premiumType?: number | string;
        connections?: Array<{
          type?: string;
          name?: string;
          verified?: boolean;
        }>;
      };

      const connections: ConnectionSnapshot[] = (profile.connections ?? []).map(
        (c) => ({
          type: c.type ?? 'unknown',
          name: c.name ?? '',
          verified: c.verified ?? false,
        }),
      );

      const badges: string[] = (profile.badges ?? [])
        .map((b) => b.description ?? b.id ?? '')
        .filter((s): s is string => s.length > 0);

      return {
        bio: profile.bio?.trim() || null,
        badges,
        premiumType: profile.premiumType != null ? String(profile.premiumType) : null,
        connections,
      };
    } catch (err) {
      this.logger.warn('profile_fetch_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      return null;
    }
  }
}
