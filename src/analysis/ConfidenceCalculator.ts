import type {
  ConfidenceFactor,
  ConfidenceScore,
  GuildActivitySummary,
  ProfileExtras,
} from '../types/domain.js';

export interface ConfidenceInput {
  mutualGuildCount: number;
  activity: ReadonlyArray<GuildActivitySummary>;
  profileExtras: ProfileExtras | null;
  accountAgeDays: number;
}

/**
 * Aggregates a 0..100 confidence score for the report.
 *
 * Higher score = more reliable picture of the user, because more independent
 * signals exist. Each factor is capped so no single noisy input dominates.
 */
export class ConfidenceCalculator {
  calculate(input: ConfidenceInput): ConfidenceScore {
    const factors: ConfidenceFactor[] = [];

    // ① mutual guilds — max 25
    {
      const max = 25;
      const contribution = Math.min(max, input.mutualGuildCount * 3);
      factors.push({
        factor: 'mutual_guilds',
        contribution,
        max,
        note: `${input.mutualGuildCount} mutual guilds`,
      });
    }

    // ② message volume — max 25 (log scaled)
    {
      const max = 25;
      const total = input.activity.reduce((s, a) => s + a.messages.totalCount, 0);
      // log10(total + 1) * 12 caps at ~25 around 100k msgs
      const contribution = Math.min(max, Math.round(Math.log10(total + 1) * 12));
      factors.push({
        factor: 'message_volume',
        contribution,
        max,
        note: `${total} messages captured`,
      });
    }

    // ③ profile fullness — max 15
    {
      const max = 15;
      let contribution = 0;
      const parts: string[] = [];
      if (input.profileExtras) {
        if (input.profileExtras.badges.length > 0) {
          contribution += 5;
          parts.push(`${input.profileExtras.badges.length} badges`);
        }
        if (input.profileExtras.connections.length > 0) {
          contribution += 5;
          parts.push(`${input.profileExtras.connections.length} connections`);
        }
        if (input.profileExtras.bio) {
          contribution += 5;
          parts.push('bio present');
        }
      }
      factors.push({
        factor: 'profile_signals',
        contribution,
        max,
        note: parts.join(', ') || 'no extras available',
      });
    }

    // ④ account age — max 15 (3 pts per year)
    {
      const max = 15;
      const years = input.accountAgeDays / 365;
      const contribution = Math.min(max, Math.round(years * 3));
      factors.push({
        factor: 'account_age',
        contribution,
        max,
        note: `${Math.round(years * 10) / 10} years old`,
      });
    }

    // ⑤ recent activity — max 10 (all-or-nothing if anything in last 30d)
    {
      const max = 10;
      const threshold = Date.now() - 30 * 86400000;
      const recent = input.activity.some(
        (a) => a.messages.lastSeenAt && a.messages.lastSeenAt.getTime() >= threshold,
      );
      factors.push({
        factor: 'recent_activity',
        contribution: recent ? max : 0,
        max,
        note: recent ? 'active in last 30 days' : 'no activity in 30 days',
      });
    }

    // ⑥ search coverage — max 10 (proportional to retrieved vs discoverable)
    {
      const max = 10;
      let totalDiscoverable = 0;
      let totalShown = 0;
      for (const a of input.activity) {
        if (a.messages.discordTotalDiscoverable !== null) {
          totalDiscoverable += a.messages.discordTotalDiscoverable;
          totalShown += a.messages.totalCount;
        }
      }
      let contribution = 0;
      let note = 'no search data';
      if (totalDiscoverable > 0) {
        contribution = Math.round((totalShown / totalDiscoverable) * max);
        note = `${totalShown}/${totalDiscoverable} of discoverable retrieved`;
      } else if (input.activity.length > 0) {
        // No search hit total — still a partial signal
        contribution = Math.min(max, input.activity.length);
        note = `${input.activity.length} guilds scanned`;
      }
      factors.push({ factor: 'search_coverage', contribution, max, note });
    }

    const score = Math.min(
      100,
      factors.reduce((s, f) => s + f.contribution, 0),
    );

    let band: ConfidenceScore['band'];
    if (score >= 80) band = 'very-high';
    else if (score >= 60) band = 'high';
    else if (score >= 35) band = 'medium';
    else band = 'low';

    return { score, band, factors };
  }
}
