import { Client, type Message, type VoiceState } from 'discord.js-selfbot-v13';
import type { Logger } from '../core/Logger.js';
import { DiscordConnectError } from '../core/Errors.js';
import type { MessageActivityCollector } from './MessageActivityCollector.js';
import type { VoiceActivityCollector } from './VoiceActivityCollector.js';

export interface DiscordClientConfig {
  token: string;
  chunkGuildsAtStartup: boolean;
}

export class DiscordClient {
  private readonly client: Client;
  private ready = false;
  private readyPromise: Promise<void> | null = null;

  constructor(
    private readonly config: DiscordClientConfig,
    private readonly logger: Logger,
    private readonly messageCollector: MessageActivityCollector,
    private readonly voiceCollector: VoiceActivityCollector,
  ) {
    this.client = new Client({});
    this.attachCollectors();
  }

  async connect(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      const onReady = async (): Promise<void> => {
        this.ready = true;
        const guildCount = this.client.guilds.cache.size;
        this.logger.info('discord_ready', { guildCount });

        if (this.config.chunkGuildsAtStartup) {
          await this.chunkAllGuilds();
        }
        this.seedActiveVoiceStates();
        resolve();
      };

      this.client.once('ready', () => {
        void onReady();
      });

      this.client.on('error', (err: Error) => {
        this.logger.error('discord_error', { message: err.message });
      });

      this.client.on('shardDisconnect', () => {
        this.logger.warn('discord_shard_disconnect');
      });

      this.client.login(this.config.token).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'unknown';
        reject(new DiscordConnectError(`login failed: ${message}`, err));
      });
    });

    return this.readyPromise;
  }

  private attachCollectors(): void {
    this.client.on('messageCreate', (message: Message) => {
      try {
        if (message.author?.bot) return;
        if (!message.guild || !message.author) return;
        const channel = message.channel;
        const channelName =
          channel && 'name' in channel && typeof channel.name === 'string'
            ? channel.name
            : `#${message.channelId}`;
        const content = (message.content ?? '').slice(0, 200);
        this.messageCollector.record(message.author.id, message.guild.id, {
          channelId: message.channelId,
          channelName,
          at: message.createdAt,
          contentPreview: content,
        });
      } catch {
        // Never let a collector exception bring down the event loop.
      }
    });

    this.client.on(
      'voiceStateUpdate',
      (oldState: VoiceState, newState: VoiceState) => {
        try {
          const userId = newState.id || oldState.id;
          const guildId = (newState.guild ?? oldState.guild)?.id;
          if (!userId || !guildId) return;
          const oldChannel = oldState.channel;
          const newChannel = newState.channel;
          this.voiceCollector.handleChange({
            userId,
            guildId,
            oldChannelId: oldState.channelId ?? null,
            oldChannelName:
              oldChannel && 'name' in oldChannel && typeof oldChannel.name === 'string'
                ? oldChannel.name
                : null,
            newChannelId: newState.channelId ?? null,
            newChannelName:
              newChannel && 'name' in newChannel && typeof newChannel.name === 'string'
                ? newChannel.name
                : null,
            at: new Date(),
          });
        } catch {
          // swallow
        }
      },
    );
  }

  private seedActiveVoiceStates(): void {
    const now = new Date();
    let seeded = 0;
    for (const guild of this.client.guilds.cache.values()) {
      for (const [, member] of guild.members.cache) {
        const voice = member.voice;
        if (!voice || !voice.channelId || !voice.channel) continue;
        const ch = voice.channel;
        const channelName =
          ch && 'name' in ch && typeof ch.name === 'string' ? ch.name : `#${voice.channelId}`;
        this.voiceCollector.seedActive(member.id, guild.id, {
          channelId: voice.channelId,
          channelName,
          joinedAt: now,
        });
        seeded++;
      }
    }
    if (seeded > 0) this.logger.info('voice_seeded', { count: seeded });
  }

  private async chunkAllGuilds(): Promise<void> {
    const guilds = Array.from(this.client.guilds.cache.values());
    let chunked = 0;
    for (const guild of guilds) {
      try {
        await guild.members.fetch();
        chunked++;
      } catch (err) {
        this.logger.warn('guild_chunk_failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
    this.logger.info('guild_chunk_complete', { chunked, total: guilds.length });
  }

  isReady(): boolean {
    return this.ready;
  }

  getRawClient(): Client {
    return this.client;
  }

  guildCount(): number {
    return this.client.guilds.cache.size;
  }

  async disconnect(): Promise<void> {
    if (this.client.isReady()) {
      this.client.destroy();
      this.logger.info('discord_disconnected');
    }
  }
}
