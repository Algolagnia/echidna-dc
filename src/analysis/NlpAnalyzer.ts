import type { RawMessageRecord } from '../discord/MessageActivityCollector.js';
import type {
  AgeHint,
  BehavioralProfile,
  EvidenceConfidence,
  GenderHint,
  GuildMembershipSnapshot,
  LanguageBreakdown,
  LanguageHint,
  ToneOverall,
  ToneProfile,
} from '../types/domain.js';

/**
 * Local, deterministic NLP layer. No external API. Operates only on public
 * data the user has already published in their own messages and nicknames.
 *
 * Detection layers:
 *  - Language: weighted scoring against compact wordlists + script ranges
 *  - Age:      self-mentions ("18 yaşındayım"), nickname numerics, year clues
 *  - Gender:   explicit role tags, self-mentions, emoji conventions
 *  - Tone:     profanity rate, caps rate, emoji density, sentiment lexicon
 */
export class NlpAnalyzer {
  analyze(
    records: ReadonlyArray<RawMessageRecord>,
    memberships: ReadonlyArray<GuildMembershipSnapshot>,
    username: string,
    globalName: string | null,
  ): BehavioralProfile {
    const language = this.detectLanguage(records);
    const age = this.estimateAge(records, memberships, username, globalName);
    const gender = this.estimateGender(records, memberships);
    const tone = this.analyzeTone(records);
    return { language, age, gender, tone };
  }

  // ─── Language ──────────────────────────────────────────────────────────────

  private detectLanguage(records: ReadonlyArray<RawMessageRecord>): LanguageBreakdown {
    const empty: LanguageBreakdown = {
      primary: 'unknown',
      distribution: [],
      sampleSize: 0,
    };
    if (records.length === 0) return empty;

    const counters: Record<LanguageHint, number> = {
      tr: 0, en: 0, ar: 0, ru: 0, de: 0, es: 0, fr: 0, unknown: 0,
    };
    let analyzed = 0;

    for (const r of records) {
      const text = (r.contentPreview ?? '').toLowerCase().trim();
      if (text.length < 3) continue;
      analyzed++;

      // Script detection (strong signal)
      if (/[؀-ۿ]/.test(text)) counters.ar += 2;
      if (/[Ѐ-ӿ]/.test(text)) counters.ru += 2;

      // Turkish: dedicated characters + frequent words
      if (/[ığüşöçİĞÜŞÖÇı]/.test(text)) counters.tr += 1;
      if (/\b(bir|bu|ne|ben|sen|biz|var|yok|çok|az|nasıl|kim|gel|git|ya|aga|knk|abi|abla|kanka|valla|tamam|olur|hadi|yapma|nerede|nereden|napıyor|napıyon|cok)\b/.test(text)) counters.tr += 2;

      // English: frequent words
      if (/\b(the|is|are|and|you|what|how|that|this|with|have|just|don|its|been|like|want|need|good|bad|gonna|wanna|yeah|nope|please|thanks)\b/.test(text)) counters.en += 2;

      // German
      if (/[äöüßÄÖÜ]/.test(text)) counters.de += 1;
      if (/\b(ich|ist|nicht|und|das|ein|mit|ja|nein|wie|was|wer|wo|wann)\b/.test(text)) counters.de += 2;

      // Spanish
      if (/[ñáéíóúÁÉÍÓÚ¿¡]/.test(text)) counters.es += 1;
      if (/\b(que|el|la|los|las|de|es|por|para|con|sí|no|hola|gracias|cómo|qué|quién|dónde)\b/.test(text)) counters.es += 2;

      // French
      if (/\b(le|la|les|de|du|des|et|est|une|un|pour|avec|oui|non|bonjour|merci|comment)\b/.test(text)) counters.fr += 2;
      if (/[éèêëàâçôùûïî]/.test(text)) counters.fr += 1;
    }

    if (analyzed === 0) return empty;

    const total = Object.values(counters).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return { primary: 'unknown', distribution: [], sampleSize: analyzed };
    }

    const distribution = (Object.entries(counters) as Array<[LanguageHint, number]>)
      .filter(([, v]) => v > 0)
      .map(([lang, v]) => ({ lang, ratio: v / total }))
      .sort((a, b) => b.ratio - a.ratio);

    return {
      primary: distribution[0]?.lang ?? 'unknown',
      distribution,
      sampleSize: analyzed,
    };
  }

  // ─── Age ───────────────────────────────────────────────────────────────────

  private estimateAge(
    records: ReadonlyArray<RawMessageRecord>,
    memberships: ReadonlyArray<GuildMembershipSnapshot>,
    username: string,
    globalName: string | null,
  ): AgeHint {
    const evidence: string[] = [];
    let bestEstimate: number | null = null;
    let bestConfidence: EvidenceConfidence = 'low';

    const consider = (
      value: number,
      reason: string,
      confidence: EvidenceConfidence,
    ): void => {
      if (value < 8 || value > 80) return; // implausible
      evidence.push(`${value} → ${reason}`);
      const rank: Record<EvidenceConfidence, number> = { low: 1, medium: 2, high: 3 };
      if (bestEstimate === null || rank[confidence] > rank[bestConfidence]) {
        bestEstimate = value;
        bestConfidence = confidence;
      }
    };

    // ① Self-mention in messages (Turkish + English variants)
    const selfPatterns: Array<{ re: RegExp; reason: string; confidence: EvidenceConfidence }> = [
      { re: /\b(\d{1,2})\s*yaş[ıi]nday[ıi]m\b/i, reason: 'self-mention "X yaşındayım"', confidence: 'high' },
      { re: /\byaş[ıi]m\s*(\d{1,2})\b/i,         reason: 'self-mention "yaşım X"',     confidence: 'high' },
      { re: /\b(\d{1,2})\s*yaş[ıi]nday\b/i,      reason: 'self-mention "X yaşında"',   confidence: 'medium' },
      { re: /\b(?:i'?m|im)\s+(\d{1,2})\s*(?:y\.?o\.?|years?\s*old)\b/i, reason: 'self-mention "I\'m X years old"', confidence: 'high' },
      { re: /\bage\s*[:=]\s*(\d{1,2})\b/i,       reason: 'self-mention "age: X"',      confidence: 'medium' },
    ];
    for (const r of records) {
      for (const p of selfPatterns) {
        const m = p.re.exec(r.contentPreview);
        if (m && m[1]) {
          consider(parseInt(m[1], 10), p.reason, p.confidence);
        }
      }
    }

    // ② Birth year mentions (1990-2015)
    const yearRe = /\b(?:19[89]\d|20[01]\d)\b/g;
    const currentYear = new Date().getFullYear();
    for (const r of records.slice(0, 50)) {
      const matches = r.contentPreview.match(yearRe);
      if (!matches) continue;
      // only treat as birth year when accompanied by a context word
      if (!/(?:doğdum|do[ğg]um|born|birthday|yıl[ıi]nda)/i.test(r.contentPreview)) continue;
      for (const y of matches) {
        const age = currentYear - parseInt(y, 10);
        consider(age, `birth year ${y}`, 'medium');
      }
    }

    // ③ Nickname numerics — small 2-digit numbers attached to names
    const nameSources: Array<{ src: string; label: string }> = [
      { src: username, label: 'username' },
    ];
    if (globalName) nameSources.push({ src: globalName, label: 'global_name' });
    for (const m of memberships) {
      if (m.nickname) nameSources.push({ src: m.nickname, label: `nick@${m.guildName}` });
    }
    const nickNumRe = /(?:^|[^\d])(\d{2})(?:[^\d]|$)/;
    for (const { src, label } of nameSources) {
      const match = nickNumRe.exec(src);
      if (!match || !match[1]) continue;
      const n = parseInt(match[1], 10);
      // typical age range for Discord users: 13-50
      if (n >= 13 && n <= 50) {
        consider(n, `numeric in ${label} ("${src}")`, 'low');
      }
    }

    return {
      estimate: bestEstimate,
      confidence: bestConfidence,
      evidence: evidence.slice(0, 6),
    };
  }

  // ─── Gender ────────────────────────────────────────────────────────────────

  private estimateGender(
    records: ReadonlyArray<RawMessageRecord>,
    memberships: ReadonlyArray<GuildMembershipSnapshot>,
  ): GenderHint {
    const evidence: string[] = [];
    let estimate: GenderHint['estimate'] = 'unknown';
    let confidence: EvidenceConfidence = 'low';

    // ① Explicit roles
    for (const m of memberships) {
      for (const role of m.roles) {
        if (/^(?:erkek|♂️|male|boy)\b/i.test(role) || /[Ee]rkek\s*[🧑👦👨]/.test(role)) {
          estimate = 'male';
          confidence = 'high';
          evidence.push(`role "${role}" @ ${m.guildName}`);
        } else if (/^(?:kad[ıi]n|kız|♀️|female|girl|woman)\b/i.test(role)) {
          estimate = 'female';
          confidence = 'high';
          evidence.push(`role "${role}" @ ${m.guildName}`);
        }
      }
    }
    if (confidence === 'high') return { estimate, confidence, evidence: evidence.slice(0, 4) };

    // ② Self-mention
    // JS \b is ASCII-only; Turkish characters break word boundaries, so we
    // avoid \b around tokens containing ğ/ı/ş etc.
    let maleHits = 0;
    let femaleHits = 0;
    for (const r of records) {
      const t = r.contentPreview.toLowerCase();
      if (/(?:^|\s)ben\s+(?:bir\s+)?(?:erkek(?:im)?|erkeğim|adamım)(?:\s|[.!?,]|$)/.test(t)) {
        maleHits++;
        evidence.push('self: ben erkeğim');
      }
      if (/\bi(?:'| )?m\s+(?:a\s+)?(?:guy|male|dude|man|boy)\b/i.test(r.contentPreview)) {
        maleHits++;
        evidence.push("self: I'm a guy");
      }
      if (/(?:^|\s)ben\s+(?:bir\s+)?(?:kız(?:ım)?|kızım|kadın(?:ım)?|kadınım)(?:\s|[.!?,]|$)/.test(t)) {
        femaleHits++;
        evidence.push('self: ben kızım');
      }
      if (/\bi(?:'| )?m\s+(?:a\s+)?(?:girl|female|woman|chick)\b/i.test(r.contentPreview)) {
        femaleHits++;
        evidence.push("self: I'm a girl");
      }
      if (maleHits + femaleHits >= 3) break;
    }

    if (maleHits > femaleHits && maleHits > 0) {
      estimate = 'male';
      confidence = maleHits >= 2 ? 'medium' : 'low';
    } else if (femaleHits > maleHits && femaleHits > 0) {
      estimate = 'female';
      confidence = femaleHits >= 2 ? 'medium' : 'low';
    }

    return { estimate, confidence, evidence: evidence.slice(0, 4) };
  }

  // ─── Tone ──────────────────────────────────────────────────────────────────

  private analyzeTone(records: ReadonlyArray<RawMessageRecord>): ToneProfile {
    if (records.length === 0) {
      return {
        overall: 'unknown',
        profanityRate: 0,
        capsRate: 0,
        emojiRate: 0,
        sampleSize: 0,
      };
    }

    // Compact wordlists. Conservative — we want signal, not opinion.
    const profanityRe =
      /\b(?:amk|aq|aw|aşşk|orsp|orospu|piç|siktir|sik|s[ıi]k|göt|got|yarrak|amına|amına\s+koyay[ıi]m|f+u+c+k|sh[i1]t|bitch|asshole|cunt|dick|wtf)\b/i;
    const positiveRe =
      /\b(?:teşekkür|sa[ğg] ?ol|harika|güzel|süper|love|nice|cool|thanks|amazing|happy|good|great)\b/i;
    const negativeRe =
      /\b(?:nefret|kötü|berbat|sucks|terrible|awful|hate|sad|bad|cry|kill|die)\b/i;

    let profCount = 0;
    let posCount = 0;
    let negCount = 0;
    let capsTotal = 0;
    let alphaTotal = 0;
    let emojiTotal = 0;
    let charTotal = 0;

    for (const r of records) {
      const text = r.contentPreview;
      if (!text || text.length < 2) continue;

      if (profanityRe.test(text)) profCount++;
      if (positiveRe.test(text)) posCount++;
      if (negativeRe.test(text)) negCount++;

      for (const ch of text) {
        const code = ch.codePointAt(0);
        if (code === undefined) continue;
        charTotal++;
        if (/[A-ZĞÜŞÖÇIİ]/.test(ch)) { capsTotal++; alphaTotal++; }
        else if (/[a-zığüşöçi]/.test(ch)) { alphaTotal++; }
        // emoji range (rough): emoticons, symbols, supplemental
        if (
          (code >= 0x1f300 && code <= 0x1faff) ||
          (code >= 0x2600 && code <= 0x27bf) ||
          (code >= 0x1f000 && code <= 0x1f02f)
        ) {
          emojiTotal++;
        }
      }
    }

    const sampleSize = records.length;
    const profanityRate = profCount / sampleSize;
    const capsRate = alphaTotal > 0 ? capsTotal / alphaTotal : 0;
    const emojiRate = charTotal > 0 ? emojiTotal / charTotal : 0;

    let overall: ToneOverall = 'neutral';
    if (posCount > negCount * 2 && posCount > 1) overall = 'positive';
    else if (negCount > posCount * 2 && negCount > 1) overall = 'negative';
    else if (posCount > 0 && negCount > 0) overall = 'mixed';

    return { overall, profanityRate, capsRate, emojiRate, sampleSize };
  }
}
