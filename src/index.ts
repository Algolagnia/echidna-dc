import { installDiskWriteGuard } from './core/DiskWriteGuard.js';
import { loadConfig } from './config/ConfigLoader.js';
import { Logger } from './core/Logger.js';
import { SystemClock } from './core/Clock.js';
import { RateLimiter } from './core/RateLimiter.js';
import { DiscordClient } from './discord/DiscordClient.js';
import { GuildScanner } from './discord/GuildScanner.js';
import { ProfileFetcher } from './discord/ProfileFetcher.js';
import { MessageActivityCollector } from './discord/MessageActivityCollector.js';
import { VoiceActivityCollector } from './discord/VoiceActivityCollector.js';
import { MessageSearcher } from './discord/MessageSearcher.js';
import { PatternDetector } from './analysis/PatternDetector.js';
import { NlpAnalyzer } from './analysis/NlpAnalyzer.js';
import { ConfidenceCalculator } from './analysis/ConfidenceCalculator.js';
import { UnifiedLookupStrategy } from './lookup/UnifiedLookupStrategy.js';
import { LookupService } from './lookup/LookupService.js';
import { MarkdownFormatter } from './report/MarkdownFormatter.js';
import { IdentityReportRenderer } from './report/IdentityReportRenderer.js';
import { ActivityReportRenderer } from './report/ActivityReportRenderer.js';
import { AuthMiddleware } from './telegram/AuthMiddleware.js';
import { CommandRouter } from './telegram/CommandRouter.js';
import { TelegramBot } from './telegram/TelegramBot.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const prettyLogs = config.NODE_ENV !== 'production';
  const logger = new Logger(config.LOG_LEVEL, prettyLogs);

  if (config.NODE_ENV === 'production') {
    installDiskWriteGuard();
    logger.info('disk_write_guard_installed');
  }

  const clock = new SystemClock();

  // Per-request rate limit (Telegram side). Discord upstream profile endpoint
  // is also implicitly throttled by this since lookup calls fetchProfileExtras.
  const rateLimiter = new RateLimiter(
    {
      lookup: RateLimiter.fromPerMinute(config.RATE_LIMIT_LOOKUP_PER_MIN),
      // ProfileFetcher uses 'deep' bucket internally; share the lookup budget.
      deep: RateLimiter.fromPerMinute(config.RATE_LIMIT_LOOKUP_PER_MIN),
      // Search API has a separate, higher budget since one lookup can issue
      // many search calls (one per mutual guild).
      search: RateLimiter.fromPerMinute(
        Math.max(60, config.SEARCH_MAX_GUILDS * config.SEARCH_PAGES_PER_GUILD * 2),
      ),
    },
    clock,
  );

  const messageCollector = new MessageActivityCollector({
    perUserGuildLimit: config.MSG_CACHE_PER_USER_GUILD,
    maxTotalRecords: config.MSG_CACHE_TOTAL,
  });
  const voiceCollector = new VoiceActivityCollector({
    perUserGuildSessionLimit: config.VOICE_SESSIONS_PER_USER_GUILD,
    maxTotalSessions: config.VOICE_SESSIONS_TOTAL,
  });

  const discord = new DiscordClient(
    { token: config.DISCORD_TOKEN, chunkGuildsAtStartup: config.CHUNK_GUILDS_AT_STARTUP },
    logger,
    messageCollector,
    voiceCollector,
  );
  const scanner = new GuildScanner(discord);
  const profileFetcher = new ProfileFetcher(discord, rateLimiter, logger);
  const messageSearcher = new MessageSearcher(discord, rateLimiter, logger, config.DISCORD_TOKEN);
  const patternDetector = new PatternDetector();
  const nlpAnalyzer = new NlpAnalyzer();
  const confidenceCalculator = new ConfidenceCalculator();
  const strategy = new UnifiedLookupStrategy(
    scanner,
    profileFetcher,
    messageCollector,
    voiceCollector,
    messageSearcher,
    patternDetector,
    nlpAnalyzer,
    confidenceCalculator,
    {
      searchEnabled: config.SEARCH_ON_LOOKUP,
      searchPagesPerGuild: config.SEARCH_PAGES_PER_GUILD,
      searchDelayBetweenGuildsMs: config.SEARCH_DELAY_BETWEEN_GUILDS_MS,
      searchDelayBetweenPagesMs: config.SEARCH_DELAY_BETWEEN_PAGES_MS,
      searchMaxGuilds: config.SEARCH_MAX_GUILDS,
    },
    logger,
  );
  const markdown = new MarkdownFormatter();
  const identityRenderer = new IdentityReportRenderer();
  const activityRenderer = new ActivityReportRenderer();
  const lookupService = new LookupService(
    strategy,
    markdown,
    identityRenderer,
    activityRenderer,
    rateLimiter,
    logger,
  );

  const auth = new AuthMiddleware(config.ADMIN_CHAT_IDS, logger);
  const router = new CommandRouter(lookupService, discord, messageCollector, voiceCollector, logger);
  const telegram = new TelegramBot({ token: config.TELEGRAM_BOT_TOKEN }, auth, router, logger);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('shutdown_started', { signal });
    try {
      await telegram.stop();
      await discord.disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error('unhandled_rejection', {
      type: reason instanceof Error ? reason.constructor.name : 'Unknown',
      message,
    });
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', {
      type: err.constructor.name,
      message: err.message,
    });
    process.exit(1);
  });

  logger.info('boot_started', {
    nodeEnv: config.NODE_ENV,
    rateLimit: config.RATE_LIMIT_LOOKUP_PER_MIN,
    msgCap: config.MSG_CACHE_TOTAL,
    voiceCap: config.VOICE_SESSIONS_TOTAL,
  });

  await discord.connect();
  await telegram.start();
  logger.info('boot_completed');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
