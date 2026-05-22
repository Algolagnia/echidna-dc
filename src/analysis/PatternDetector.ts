import type { RawMessageRecord } from '../discord/MessageActivityCollector.js';
import type {
  RiskAssessment,
  RiskCategory,
  RiskFlag,
  RiskSeverity,
} from '../types/domain.js';

interface PatternDef {
  category: RiskCategory;
  severity: RiskSeverity;
  re: RegExp;
  description: string;
}

/**
 * Local, allow-no-network detection of scam / abuse patterns in message
 * previews. Conservative on purpose: false positives are worse than false
 * negatives because flags will visually push the analyst.
 *
 * Categories:
 *  - nitro-scam:     fake Discord Nitro / gift phishing
 *  - phishing-url:   steam / discord look-alike domains, fake giveaway sites
 *  - token-grabber:  references to token grabbers or webhook leaking
 *  - crypto-scam:    free crypto giveaway / wallet verification phishing
 *  - mass-mention:   multiple mentions in a single message (raid signal)
 *  - suspicious-link: URL shorteners (used to obscure destination)
 *  - invite-spam:    multiple Discord invite codes in the same message
 */
export class PatternDetector {
  private static readonly PATTERNS: ReadonlyArray<PatternDef> = [
    {
      category: 'nitro-scam',
      severity: 'high',
      // "free nitro", "claim nitro", "discord.gift/xyz", "discord-nitro", etc.
      re: /\b(?:discord(?:\.|-)?(?:gift|nitro)|disc(?:o|0)rd[\s-]?nitro|(?:free|claim|airdrop|win)[\s-]?nitro|nitro[\s-]?(?:free|giveaway|drop))\b/i,
      description: 'Fake Discord Nitro/gift phishing keyword',
    },
    {
      category: 'phishing-url',
      severity: 'high',
      re: /(steamcommunity[\.\-](?!com)[a-z]{2,5}|steamcornmunity|steam-?gift\.|steam-?trade-?off|disc(?:o|0)rd[\.\-](?!com\b)[a-z]{2,5}\b)/i,
      description: 'Steam / Discord look-alike phishing domain',
    },
    {
      category: 'token-grabber',
      severity: 'high',
      re: /\b(token[\s-]?(?:grab(?:ber)?|stealer|logger|dump)|discord[\s-]?token[\s-]?(?:dump|leak)|webhook\.url|api\/webhooks\/\d+\/[\w-]+)\b/i,
      description: 'Token grabber or webhook leak hint',
    },
    {
      category: 'crypto-scam',
      severity: 'medium',
      re: /\b(?:metamask[\s-]?(?:verify|connect|drain)|wallet[\s-]?(?:verify|connect)|crypto[\s-]?(?:double|giveaway|airdrop)|free[\s-]?(?:btc|eth|usdt|sol)|claim[\s-]?(?:airdrop|reward)\b)/i,
      description: 'Crypto giveaway / wallet phishing',
    },
    {
      category: 'mass-mention',
      severity: 'medium',
      // 5+ user mentions, or repeated @everyone/@here
      re: /(?:<@!?\d+>[^<]{0,80}){5,}|(?:@(?:everyone|here)\b[^@]{0,80}){2,}/i,
      description: 'Mass mention / raid pattern',
    },
    {
      category: 'suspicious-link',
      severity: 'low',
      re: /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|shorturl\.at|rb\.gy|rebrand\.ly)\//i,
      description: 'URL shortener (obscured destination)',
    },
    {
      category: 'invite-spam',
      severity: 'low',
      re: /(?:discord\.gg\/[A-Za-z0-9]{2,}[^a-z0-9]+){2,}|(?:discord\.com\/invite\/[A-Za-z0-9]{2,}[^a-z0-9]+){2,}/i,
      description: 'Multiple Discord invites in one message',
    },
  ];

  /** Detect flags across all gathered records for one user. */
  detectAll(
    perGuild: ReadonlyArray<{
      guildId: string;
      guildName: string;
      records: ReadonlyArray<RawMessageRecord>;
    }>,
  ): RiskAssessment {
    const flags: RiskFlag[] = [];
    for (const { guildId, guildName, records } of perGuild) {
      for (const r of records) {
        const content = r.contentPreview;
        if (!content) continue;
        for (const p of PatternDetector.PATTERNS) {
          if (p.re.test(content)) {
            flags.push({
              category: p.category,
              severity: p.severity,
              description: p.description,
              evidence: content.slice(0, 150),
              guildId,
              guildName,
              channelName: r.channelName,
              at: r.at,
            });
            break; // one flag per message (highest-priority pattern wins)
          }
        }
      }
    }

    // sort: severity desc, then date desc
    const order: Record<RiskSeverity, number> = { high: 3, medium: 2, low: 1 };
    flags.sort((a, b) => {
      const sev = order[b.severity] - order[a.severity];
      if (sev !== 0) return sev;
      return b.at.getTime() - a.at.getTime();
    });

    return {
      flags,
      totalFlagged: flags.length,
      highSeverityCount: flags.filter((f) => f.severity === 'high').length,
      mediumSeverityCount: flags.filter((f) => f.severity === 'medium').length,
      lowSeverityCount: flags.filter((f) => f.severity === 'low').length,
    };
  }
}
