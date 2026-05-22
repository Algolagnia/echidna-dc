import type { GuildScanner } from '../discord/GuildScanner.js';
import type { ProfileFetcher } from '../discord/ProfileFetcher.js';
import type { MessageActivityCollector, RawMessageRecord } from '../discord/MessageActivityCollector.js';
import type { VoiceActivityCollector } from '../discord/VoiceActivityCollector.js';
import type { MessageSearcher } from '../discord/MessageSearcher.js';
import { computeMessageStats, mergeRecords } from '../discord/messageStats.js';
import type { Logger } from '../core/Logger.js';
import { UserNotFoundError } from '../core/Errors.js';
import type { LookupReport } from './LookupReport.js';
import type { GuildActivitySummary } from '../types/domain.js';
import type { PatternDetector } from '../analysis/PatternDetector.js';
import type { NlpAnalyzer } from '../analysis/NlpAnalyzer.js';
import type { ConfidenceCalculator } from '../analysis/ConfidenceCalculator.js';

export interface UnifiedLookupConfig {
  searchEnabled: boolean;
  searchPagesPerGuild: number;
  searchDelayBetweenGuildsMs: number;
  searchDelayBetweenPagesMs: number;
  searchMaxGuilds: number;
}

/**
 * Single comprehensive lookup. Combines:
 *  - live RAM cache from gateway events
 *  - on-demand Discord search API per guild
 *  - mutual guild memberships (roles, voice state)
 *  - profile extras (bio, badges, connections)
 *  - risk pattern detection (scam/phishing/abuse)
 *  - behavioral analysis (language, age, gender, tone)
 *  - confidence score
 */
export class UnifiedLookupStrategy {
  constructor(
    private readonly scanner: GuildScanner,
    private readonly profileFetcher: ProfileFetcher,
    private readonly messageCollector: MessageActivityCollector,
    private readonly voiceCollector: VoiceActivityCollector,
    private readonly messageSearcher: MessageSearcher,
    private readonly patternDetector: PatternDetector,
    private readonly nlpAnalyzer: NlpAnalyzer,
    private readonly confidenceCalculator: ConfidenceCalculator,
    private readonly config: UnifiedLookupConfig,
    private readonly logger: Logger,
  ) {}

  async execute(userId: string): Promise<LookupReport> {
    const start = Date.now();
    const scan = this.scanner.scan(userId);

    const user = scan ? scan.user : await this.profileFetcher.fetchUser(userId);
    if (!user) {
      throw new UserNotFoundError(`user ${userId} not found`);
    }

    const memberships = scan?.memberships ?? [];
    const now = new Date();

    const searchTargets = this.config.searchEnabled
      ? memberships.slice(0, this.config.searchMaxGuilds)
      : [];

    const activity: GuildActivitySummary[] = [];
    const perGuildRecords: Array<{
      guildId: string;
      guildName: string;
      records: RawMessageRecord[];
    }> = [];
    let searchedGuilds = 0;
    let searchHits = 0;

    for (const m of memberships) {
      const liveRecords = this.messageCollector.getRawRecords(userId, m.guildId);
      let merged: ReadonlyArray<RawMessageRecord> = liveRecords;
      let totalDiscoverable: number | null = null;

      const shouldSearch = searchTargets.includes(m);
      if (shouldSearch) {
        try {
          const outcome = await this.messageSearcher.searchUserInGuild(
            m.guildId,
            userId,
            {
              pagesPerGuild: this.config.searchPagesPerGuild,
              perGuildDelayMs: this.config.searchDelayBetweenPagesMs,
            },
          );
          if (outcome.records.length > 0) {
            merged = mergeRecords(liveRecords, outcome.records);
            searchHits += outcome.records.length;
          }
          totalDiscoverable = outcome.totalDiscoverable;
          searchedGuilds++;
        } catch (err) {
          this.logger.warn('search_skipped', {
            type: err instanceof Error ? err.constructor.name : 'Unknown',
            message: err instanceof Error ? err.message : 'unknown',
          });
        }

        if (this.config.searchDelayBetweenGuildsMs > 0) {
          await sleep(this.config.searchDelayBetweenGuildsMs);
        }
      }

      activity.push({
        guildId: m.guildId,
        guildName: m.guildName,
        messages: computeMessageStats(merged, totalDiscoverable),
        voice: this.voiceCollector.getStats(userId, m.guildId, now),
      });
      perGuildRecords.push({
        guildId: m.guildId,
        guildName: m.guildName,
        records: [...merged],
      });
    }

    if (searchTargets.length > 0) {
      this.logger.info('search_completed', {
        searchedGuilds,
        totalGuilds: memberships.length,
        hits: searchHits,
      });
    }

    const profileExtras = await this.profileFetcher.fetchProfileExtras(userId);

    // ─── analysis layers ──────────────────────────────────────────────────
    const allRecords: RawMessageRecord[] = perGuildRecords.flatMap((g) => g.records);

    const risk = this.patternDetector.detectAll(perGuildRecords);
    const behavioral = this.nlpAnalyzer.analyze(
      allRecords,
      memberships,
      user.username,
      user.globalName,
    );
    const confidence = this.confidenceCalculator.calculate({
      mutualGuildCount: memberships.length,
      activity,
      profileExtras,
      accountAgeDays: user.ageDays,
    });

    if (risk.totalFlagged > 0) {
      this.logger.info('risk_flags_detected', {
        total: risk.totalFlagged,
        high: risk.highSeverityCount,
        medium: risk.mediumSeverityCount,
        low: risk.lowSeverityCount,
      });
    }
    this.logger.info('analysis_complete', {
      confidenceScore: confidence.score,
      confidenceBand: confidence.band,
      langPrimary: behavioral.language.primary,
      langSampleSize: behavioral.language.sampleSize,
      ageEstimate: behavioral.age.estimate,
      ageConfidence: behavioral.age.confidence,
      genderEstimate: behavioral.gender.estimate,
      genderConfidence: behavioral.gender.confidence,
      tone: behavioral.tone.overall,
    });

    return {
      user,
      memberships,
      activity,
      profileExtras,
      mutualGuildCount: memberships.length,
      durationMs: Date.now() - start,
      fetchedAt: new Date(),
      fromCache: scan !== null,
      risk,
      behavioral,
      confidence,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
