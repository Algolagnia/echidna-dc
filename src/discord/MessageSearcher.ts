import type { Guild } from 'discord.js-selfbot-v13';
import type { DiscordClient } from './DiscordClient.js';
import type { RateLimiter } from '../core/RateLimiter.js';
import type { Logger } from '../core/Logger.js';
import { RateLimitedError } from '../core/Errors.js';
import type { RawMessageRecord } from './MessageActivityCollector.js';

interface RawApiMessage {
  id?: string;
  channel_id?: string;
  author?: { id?: string };
  content?: string;
  timestamp?: string;
  hit?: boolean;
}

interface RawSearchResponse {
  messages?: RawApiMessage[][];
  total_results?: number;
}

// Browser/desktop client header set. Mimics the Discord desktop app so that
// our REST traffic blends in with the gateway connection the library opened.
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.62 Chrome/124.0.6367.243 Electron/30.0.6 Safari/537.36';

const SUPER_PROPERTIES_JSON = JSON.stringify({
  os: 'Linux',
  browser: 'Discord Client',
  release_channel: 'stable',
  client_version: '0.0.62',
  os_version: '6.5.0',
  os_arch: 'x64',
  system_locale: 'en-US',
  browser_user_agent: USER_AGENT,
  browser_version: '30.0.6',
  client_build_number: 308880,
  native_build_number: 53550,
  client_event_source: null,
  design_id: 0,
});
const SUPER_PROPERTIES_B64 = Buffer.from(SUPER_PROPERTIES_JSON).toString('base64');

export interface SearchOptions {
  pagesPerGuild: number;
  perGuildDelayMs: number;
}

export interface SearchOutcome {
  records: RawMessageRecord[];
  /** Discord's total_results figure (≥ records.length once paginating stops). */
  totalDiscoverable: number | null;
}

/**
 * Searches a user's messages in a single guild via Discord's public
 * `/guilds/{id}/messages/search` endpoint.
 *
 * Uses native `fetch` directly against API v9 because the library's
 * route-builder constructs the wrong URL in this version (returns 404).
 */
export class MessageSearcher {
  constructor(
    private readonly discord: DiscordClient,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
    private readonly token: string,
  ) {}

  async searchUserInGuild(
    guildId: string,
    userId: string,
    options: SearchOptions,
  ): Promise<SearchOutcome> {
    const decision = this.rateLimiter.check('search');
    if (!decision.allowed) {
      throw new RateLimitedError(decision.retryAfterMs);
    }

    const client = this.discord.getRawClient();
    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) return { records: [], totalDiscoverable: null };

    const collected: RawMessageRecord[] = [];
    let totalDiscoverable: number | null = null;
    const pageSize = 25;
    const maxPages = Math.max(1, options.pagesPerGuild);

    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const url =
        `https://discord.com/api/v9/guilds/${encodeURIComponent(guildId)}/messages/search` +
        `?author_id=${encodeURIComponent(userId)}&include_nsfw=true&offset=${offset}&limit=${pageSize}`;

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: this.token,
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': USER_AGENT,
            'X-Super-Properties': SUPER_PROPERTIES_B64,
            'X-Discord-Locale': 'en-US',
            'X-Debug-Options': 'bugReporterEnabled',
          },
        });
      } catch (err) {
        this.logger.warn('search_fetch_failed', {
          page,
          message: err instanceof Error ? err.message : 'unknown',
        });
        break;
      }

      // 202 = guild not indexed yet; Discord asks us to retry.
      if (res.status === 202) {
        const body = (await res.json().catch(() => null)) as { retry_after?: number } | null;
        const retryMs = Math.max(1000, Math.floor((body?.retry_after ?? 2) * 1000));
        this.logger.info('search_indexing', { page, retryMs });
        await sleep(retryMs);
        page--; // retry same page
        continue;
      }

      // 429 = rate limited. Honor retry_after and try the same page once.
      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as { retry_after?: number } | null;
        const retryMs = Math.max(1000, Math.floor((body?.retry_after ?? 2) * 1000));
        this.logger.warn('search_rate_limited_by_discord', { page, retryMs });
        await sleep(retryMs);
        page--;
        continue;
      }

      // 401/403 = auth or permission problem; skip this guild silently.
      if (res.status === 401 || res.status === 403) {
        this.logger.info('search_permission_denied', { status: res.status });
        break;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn('search_failed', {
          page,
          status: res.status,
          body: body.slice(0, 200),
        });
        break;
      }

      const result = (await res.json().catch(() => null)) as RawSearchResponse | null;
      if (!result || !Array.isArray(result.messages)) break;

      if (typeof result.total_results === 'number') {
        totalDiscoverable = result.total_results;
      }

      let added = 0;
      for (const hitGroup of result.messages) {
        if (!Array.isArray(hitGroup)) continue;
        const hit = hitGroup.find(
          (m) => m && (m.hit === true || m.author?.id === userId),
        );
        if (!hit) continue;
        const record = this.toRecord(hit, guild);
        if (record) {
          collected.push(record);
          added++;
        }
      }

      if (added === 0) break;
      if (
        typeof result.total_results === 'number' &&
        offset + added >= result.total_results
      ) {
        break;
      }
      if (result.messages.length < pageSize) break;

      if (page < maxPages - 1 && options.perGuildDelayMs > 0) {
        await sleep(options.perGuildDelayMs);
      }
    }

    return { records: collected, totalDiscoverable };
  }

  private toRecord(msg: RawApiMessage, guild: Guild): RawMessageRecord | null {
    const channelId = msg.channel_id;
    if (!channelId) return null;
    const channel = guild.channels.cache.get(channelId);
    const channelName =
      channel && 'name' in channel && typeof channel.name === 'string'
        ? channel.name
        : `#${channelId}`;
    const at = msg.timestamp ? new Date(msg.timestamp) : new Date();
    return {
      channelId,
      channelName,
      at,
      contentPreview: (msg.content ?? '').slice(0, 200),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
