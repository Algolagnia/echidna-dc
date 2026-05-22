import { type Bot, type Context, InputFile } from 'grammy';
import type { LookupService } from '../lookup/LookupService.js';
import type { DiscordClient } from '../discord/DiscordClient.js';
import type { MessageActivityCollector } from '../discord/MessageActivityCollector.js';
import type { VoiceActivityCollector } from '../discord/VoiceActivityCollector.js';
import type { Logger } from '../core/Logger.js';

export class CommandRouter {
  constructor(
    private readonly lookupService: LookupService,
    private readonly discord: DiscordClient,
    private readonly messageCollector: MessageActivityCollector,
    private readonly voiceCollector: VoiceActivityCollector,
    private readonly logger: Logger,
    private readonly startedAt: Date = new Date(),
  ) {}

  register(bot: Bot): void {
    bot.command('start', (ctx) => this.help(ctx));
    bot.command('help', (ctx) => this.help(ctx));
    bot.command('status', (ctx) => this.status(ctx));
    bot.command('lookup', (ctx) => this.runLookup(ctx));
  }

  private async help(ctx: Context): Promise<void> {
    const text =
      '```\n' +
      '┌──────────────────────────────────┐\n' +
      '│  echidna · command reference     │\n' +
      '└──────────────────────────────────┘\n' +
      '\n' +
      '  /lookup <discord_id>\n' +
      '      tam OSINT sorgusu —\n' +
      '      kimlik, takma adlar,\n' +
      '      mesajlar, ses geçmişi,\n' +
      '      anlık ses durumu.\n' +
      '      iki html dosyası gelir:\n' +
      '        • identity report\n' +
      '        • activity report\n' +
      '\n' +
      '  /status\n' +
      '      servis sağlığı, RAM cache\n' +
      '      boyutu, uptime\n' +
      '\n' +
      '  /help\n' +
      '      bu mesaj\n' +
      '\n' +
      '  ───────────────────────────────\n' +
      '  rate limit: 6 lookup / dk\n' +
      '  zero persistence · RAM only\n' +
      '```';
    await ctx.reply(text, { parse_mode: 'MarkdownV2' }).catch(() => ctx.reply(text));
  }

  private async status(ctx: Context): Promise<void> {
    const uptimeS = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    const msgSize = this.messageCollector.size();
    const voiceSize = this.voiceCollector.size();
    const ready = this.discord.isReady();
    const text =
      '```\n' +
      '┌──────────────────────────────────┐\n' +
      '│  echidna · status                │\n' +
      '└──────────────────────────────────┘\n' +
      '\n' +
      `  discord       ${ready ? '✓ ready' : '⏳ warming'}\n` +
      `  guilds        ${this.discord.guildCount()}\n` +
      `  uptime        ${this.formatUptime(uptimeS)}\n` +
      '\n' +
      '  ─── RAM cache ───\n' +
      `  msg users     ${msgSize.users}\n` +
      `  msg records   ${msgSize.totalRecords}\n` +
      `  voice users   ${voiceSize.users}\n` +
      `  voice live    ${voiceSize.activeSessions}\n` +
      `  voice total   ${voiceSize.totalSessions}\n` +
      '```';
    await ctx.reply(text, { parse_mode: 'MarkdownV2' }).catch(() => ctx.reply(text));
  }

  private async runLookup(ctx: Context): Promise<void> {
    if (!this.discord.isReady()) {
      await ctx.reply('⏳ discord client is still warming up — try again in a few seconds.');
      return;
    }
    const text = ctx.message?.text ?? '';
    const parts = text.trim().split(/\s+/);
    const arg = parts[1];
    if (!arg) {
      await ctx.reply('usage:  /lookup <discord_id>');
      return;
    }

    const result = await this.lookupService.lookup(arg);
    if (!result.ok) {
      await ctx.reply(`✕ ${result.message}`);
      return;
    }

    // 1) Identity report with the summary as caption.
    try {
      const idFile = new InputFile(result.identityHtml, result.identityFilename);
      await ctx.replyWithDocument(idFile, {
        caption: this.captionForSummary(result.summary),
        parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      this.logger.warn('telegram_send_identity_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      try {
        await ctx.reply(result.summary, { parse_mode: 'MarkdownV2' });
      } catch {
        await ctx.reply(this.stripMarkdown(result.summary));
      }
      try {
        const idFile = new InputFile(result.identityHtml, result.identityFilename);
        await ctx.replyWithDocument(idFile);
      } catch (err2) {
        this.logger.error('telegram_send_identity_retry_failed', {
          message: err2 instanceof Error ? err2.message : 'unknown',
        });
      }
    }

    // 2) Activity report follows.
    try {
      const actFile = new InputFile(result.activityHtml, result.activityFilename);
      await ctx.replyWithDocument(actFile, {
        caption: '↑ identity · ↓ activity',
      });
    } catch (err) {
      this.logger.error('telegram_send_activity_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      await ctx.reply('⚠ activity report could not be attached.');
    }
  }

  private captionForSummary(summary: string): string {
    const stripped = summary.replace(/^```\n?/, '').replace(/\n?```$/, '');
    const max = 950;
    if (stripped.length <= max) return '```\n' + this.escapeForMdv2InCode(stripped) + '\n```';
    return (
      '```\n' +
      this.escapeForMdv2InCode(stripped.slice(0, max)) +
      '\n…(truncated; see attached html)\n```'
    );
  }

  private escapeForMdv2InCode(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  }

  private stripMarkdown(s: string): string {
    return s.replace(/```/g, '').trim();
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
}
