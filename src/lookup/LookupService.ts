import { randomUUID } from 'node:crypto';
import type { UnifiedLookupStrategy } from './UnifiedLookupStrategy.js';
import type { MarkdownFormatter } from '../report/MarkdownFormatter.js';
import type { IdentityReportRenderer } from '../report/IdentityReportRenderer.js';
import type { ActivityReportRenderer } from '../report/ActivityReportRenderer.js';
import type { Logger } from '../core/Logger.js';
import type { RateLimiter } from '../core/RateLimiter.js';
import { SnowflakeDecoder } from '../discord/SnowflakeDecoder.js';
import type { LookupReport } from './LookupReport.js';

export interface LookupSuccess {
  ok: true;
  summary: string;
  identityHtml: Buffer;
  identityFilename: string;
  activityHtml: Buffer;
  activityFilename: string;
  durationMs: number;
}
export interface LookupFailure {
  ok: false;
  errorCode: 'invalid_id' | 'not_found' | 'rate_limited' | 'internal';
  message: string;
  retryAfterMs?: number;
}
export type LookupResult = LookupSuccess | LookupFailure;

export class LookupService {
  constructor(
    private readonly strategy: UnifiedLookupStrategy,
    private readonly markdown: MarkdownFormatter,
    private readonly identityRenderer: IdentityReportRenderer,
    private readonly activityRenderer: ActivityReportRenderer,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {}

  async lookup(userId: string): Promise<LookupResult> {
    const opId = randomUUID().slice(0, 8);
    const start = Date.now();

    if (!SnowflakeDecoder.isValidId(userId)) {
      this.logger.info('lookup_invalid_id', { opId });
      return {
        ok: false,
        errorCode: 'invalid_id',
        message: 'Geçersiz Discord ID. 17-20 haneli sayı bekleniyor.',
      };
    }

    const decision = this.rateLimiter.check('lookup');
    if (!decision.allowed) {
      this.logger.warn('lookup_rate_limited', { opId, retryAfterMs: decision.retryAfterMs });
      return {
        ok: false,
        errorCode: 'rate_limited',
        message: `Rate limit. ${Math.ceil(decision.retryAfterMs / 1000)}s sonra dene.`,
        retryAfterMs: decision.retryAfterMs,
      };
    }

    this.logger.info('lookup_started', { opId });
    try {
      const report: LookupReport = await this.strategy.execute(userId);
      const summary = this.markdown.format(report);
      const identityHtml = Buffer.from(this.identityRenderer.render(report), 'utf-8');
      const activityHtml = Buffer.from(this.activityRenderer.render(report), 'utf-8');

      const timestamp = Date.now();
      const identityFilename = `echidna_identity_${report.user.id}_${timestamp}.html`;
      const activityFilename = `echidna_activity_${report.user.id}_${timestamp}.html`;

      this.logger.info('lookup_completed', {
        opId,
        durationMs: Date.now() - start,
        mutualGuildCount: report.mutualGuildCount,
        fromCache: report.fromCache,
        identityBytes: identityHtml.byteLength,
        activityBytes: activityHtml.byteLength,
      });

      return {
        ok: true,
        summary,
        identityHtml,
        identityFilename,
        activityHtml,
        activityFilename,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return this.classify(err, opId, start);
    }
  }

  private classify(err: unknown, opId: string, start: number): LookupFailure {
    const durationMs = Date.now() - start;
    const name = err instanceof Error ? err.constructor.name : 'Unknown';

    if (name === 'RateLimitedError') {
      const retryAfterMs = (err as { retryAfterMs?: number }).retryAfterMs ?? 1000;
      this.logger.warn('lookup_upstream_rate_limited', { opId, durationMs, retryAfterMs });
      return {
        ok: false,
        errorCode: 'rate_limited',
        message: `Discord rate limit. ${Math.ceil(retryAfterMs / 1000)}s sonra dene.`,
        retryAfterMs,
      };
    }
    if (name === 'UserNotFoundError') {
      this.logger.info('lookup_not_found', { opId, durationMs });
      const msg = err instanceof Error ? err.message : 'kullanıcı bulunamadı';
      return { ok: false, errorCode: 'not_found', message: msg };
    }
    this.logger.error('lookup_failed', {
      opId,
      durationMs,
      type: name,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return {
      ok: false,
      errorCode: 'internal',
      message: 'Lookup başarısız oldu. Loglara bakın.',
    };
  }
}
