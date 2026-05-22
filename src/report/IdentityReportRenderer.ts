import type { LookupReport } from '../lookup/LookupReport.js';
import type {
  BehavioralProfile,
  ConfidenceScore,
  LanguageHint,
  ProfileExtras,
  RiskAssessment,
} from '../types/domain.js';
import { deriveAliases, type AliasEntry } from '../lookup/aliases.js';
import {
  classifyServer,
  CATEGORY_LABELS,
  type ServerCategory,
} from '../lookup/serverClassifier.js';
import { LANG_SWITCH_SCRIPT, SHARED_CSS } from './theme.js';

const LANG_LABEL: Record<LanguageHint, string> = {
  tr: 'Türkçe',
  en: 'English',
  ar: 'العربية',
  ru: 'Русский',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  unknown: 'unknown',
};

/**
 * Identity report: who the user is.
 *
 * Sections:
 *  - identity (id, username, age, avatar, etc.)
 *  - aliases (every name we've seen)
 *  - profile (bio, premium, badges, connections)
 *  - guilds grouped by category (no message detail, just classification)
 */
export class IdentityReportRenderer {
  render(report: LookupReport): string {
    const aliases = deriveAliases(report);
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>echidna · ${this.esc(report.user.username)} · identity</title>
<style>${SHARED_CSS}</style>
</head>
<body>
<div class="frame">
${this.barBlock()}
${this.headerBlock(report)}
${this.confidenceBlock(report.confidence)}
${this.riskBlock(report.risk)}
${this.identityBlock(report)}
${this.aliasBlock(aliases)}
${this.behavioralBlock(report.behavioral)}
${report.profileExtras ? this.profileBlock(report.profileExtras) : ''}
${this.guildClassificationBlock(report)}
${this.footBlock(report)}
</div>
<script>${LANG_SWITCH_SCRIPT}</script>
</body>
</html>`;
  }

  private confidenceBlock(c: ConfidenceScore): string {
    const factorRows = c.factors
      .map((f) => {
        const ratio = f.max > 0 ? (f.contribution / f.max) * 100 : 0;
        return `<div class="factor">
          <span class="name">${this.esc(f.factor)}</span>
          <span class="bar"><span class="fill" style="width:${ratio.toFixed(0)}%"></span></span>
          <span class="val">${f.contribution}/${f.max}</span>
          <span class="note">${this.esc(f.note)}</span>
        </div>`;
      })
      .join('');
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── güven puanı ───</div>
  <div class="section-title" data-lang="en">─── confidence ───</div>
  <div class="confidence">
    <div>
      <div class="score">${c.score}</div>
      <div class="score-band">${this.esc(c.band)}</div>
    </div>
    <div class="gauge-wrap">
      <div class="confidence-bar"><div class="fill" style="width:${c.score}%"></div></div>
      ${factorRows}
    </div>
  </div>
  <div style="margin-top:10px;font-size:11px;color:#9ca3af">
    <span data-lang="tr">puan, raporun ne kadar zengin sinyale dayandığını gösterir; kullanıcı suçluluğu değil veri yoğunluğu</span>
    <span data-lang="en">the score reflects how rich the underlying signals are, not the user's guilt — it measures data density</span>
  </div>
</div>`;
  }

  private riskBlock(r: RiskAssessment): string {
    const pills = `<div class="risk-summary">
      <div class="pill high">
        <div class="n">${r.highSeverityCount}</div>
        <div class="lbl"><span data-lang="tr">yüksek</span><span data-lang="en">high</span></div>
      </div>
      <div class="pill med">
        <div class="n">${r.mediumSeverityCount}</div>
        <div class="lbl"><span data-lang="tr">orta</span><span data-lang="en">medium</span></div>
      </div>
      <div class="pill low">
        <div class="n">${r.lowSeverityCount}</div>
        <div class="lbl"><span data-lang="tr">düşük</span><span data-lang="en">low</span></div>
      </div>
      <div class="pill">
        <div class="n">${r.totalFlagged}</div>
        <div class="lbl"><span data-lang="tr">toplam</span><span data-lang="en">total</span></div>
      </div>
    </div>`;

    const items =
      r.flags.length === 0
        ? `<div class="empty"><span data-lang="tr">şüpheli mesaj tespit edilmedi</span><span data-lang="en">no suspicious patterns detected</span></div>`
        : r.flags
            .slice(0, 25)
            .map(
              (f) => `<div class="flag ${f.severity}">
        <div class="head">
          <span class="cat">${this.esc(f.category)} · ${this.esc(f.severity)}</span>
          <span class="when">${f.at.toISOString().slice(0, 19).replace('T', ' ')}</span>
        </div>
        <div class="where">⌬ ${this.esc(f.guildName)}  ·  #${this.esc(f.channelName)}</div>
        <div class="ev">${this.esc(f.evidence)}</div>
      </div>`,
            )
            .join('');

    const more =
      r.flags.length > 25
        ? `<div style="font-size:11px;color:#9ca3af;margin-top:6px;text-align:right">
        <span data-lang="tr">+${r.flags.length - 25} daha (kalan flag'ler activity raporunda)</span>
        <span data-lang="en">+${r.flags.length - 25} more (remaining flags in the activity report)</span>
      </div>`
        : '';

    return `<div class="section">
  <div class="section-title blood" data-lang="tr">─── risk tarama ───</div>
  <div class="section-title blood" data-lang="en">─── risk scan ───</div>
  ${pills}
  ${items}
  ${more}
</div>`;
  }

  private behavioralBlock(b: BehavioralProfile): string {
    const langCard = this.languageCard(b);
    const ageCard = this.ageCard(b);
    const genderCard = this.genderCard(b);
    const toneCard = this.toneCard(b);
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── davranışsal profil ───</div>
  <div class="section-title" data-lang="en">─── behavioral profile ───</div>
  <div class="behav-grid">
    ${langCard}
    ${ageCard}
    ${genderCard}
    ${toneCard}
  </div>
  <div style="margin-top:10px;font-size:11px;color:#9ca3af">
    <span data-lang="tr">analiz kullanıcının kendi yazdığı mesajlardan ve rol etiketlerinden çıkarılır; tahmindir, kesinlik yoktur</span>
    <span data-lang="en">inferred from the user's own published messages and role tags; estimates only, not facts</span>
  </div>
</div>`;
  }

  private languageCard(b: BehavioralProfile): string {
    const lang = b.language;
    const top3 = lang.distribution.slice(0, 4);
    const bars = top3
      .map(
        (d) => `<div class="bar-row">
        <span class="lbl">${this.esc(LANG_LABEL[d.lang])}</span>
        <span class="track"><span class="fill" style="width:${(d.ratio * 100).toFixed(0)}%"></span></span>
        <span class="val">${(d.ratio * 100).toFixed(0)}%</span>
      </div>`,
      )
      .join('');
    return `<div class="behav-card">
      <div class="label"><span data-lang="tr">dil</span><span data-lang="en">language</span></div>
      <div class="primary">${this.esc(LANG_LABEL[lang.primary])}</div>
      <div class="conf"><span data-lang="tr">örneklem: ${lang.sampleSize}</span><span data-lang="en">sample size: ${lang.sampleSize}</span></div>
      ${bars}
    </div>`;
  }

  private ageCard(b: BehavioralProfile): string {
    const a = b.age;
    const value = a.estimate !== null ? `${a.estimate}` : '∅';
    const evRows =
      a.evidence.length > 0
        ? a.evidence.map((e) => `<div class="ev">${this.esc(e)}</div>`).join('')
        : `<div class="ev"><span data-lang="tr">kanıt yok</span><span data-lang="en">no evidence</span></div>`;
    return `<div class="behav-card">
      <div class="label"><span data-lang="tr">tahmini yaş</span><span data-lang="en">est. age</span></div>
      <div class="primary">${value}</div>
      <div class="conf ${a.confidence}">
        <span data-lang="tr">güven: ${this.esc(a.confidence)}</span>
        <span data-lang="en">confidence: ${this.esc(a.confidence)}</span>
      </div>
      ${evRows}
    </div>`;
  }

  private genderCard(b: BehavioralProfile): string {
    const g = b.gender;
    const map: Record<string, { tr: string; en: string }> = {
      male: { tr: 'erkek', en: 'male' },
      female: { tr: 'kadın', en: 'female' },
      other: { tr: 'diğer', en: 'other' },
      unknown: { tr: 'bilinmiyor', en: 'unknown' },
    };
    const labels = map[g.estimate] ?? map.unknown!;
    const evRows =
      g.evidence.length > 0
        ? g.evidence.map((e) => `<div class="ev">${this.esc(e)}</div>`).join('')
        : `<div class="ev"><span data-lang="tr">kanıt yok</span><span data-lang="en">no evidence</span></div>`;
    return `<div class="behav-card">
      <div class="label"><span data-lang="tr">tahmini cinsiyet</span><span data-lang="en">est. gender</span></div>
      <div class="primary">
        <span data-lang="tr">${this.esc(labels.tr)}</span>
        <span data-lang="en">${this.esc(labels.en)}</span>
      </div>
      <div class="conf ${g.confidence}">
        <span data-lang="tr">güven: ${this.esc(g.confidence)}</span>
        <span data-lang="en">confidence: ${this.esc(g.confidence)}</span>
      </div>
      ${evRows}
    </div>`;
  }

  private toneCard(b: BehavioralProfile): string {
    const t = b.tone;
    const toneMap: Record<string, { tr: string; en: string }> = {
      positive: { tr: 'pozitif', en: 'positive' },
      neutral: { tr: 'nötr', en: 'neutral' },
      negative: { tr: 'negatif', en: 'negative' },
      mixed: { tr: 'karışık', en: 'mixed' },
      unknown: { tr: 'bilinmiyor', en: 'unknown' },
    };
    const tone = toneMap[t.overall] ?? toneMap.unknown!;
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    return `<div class="behav-card">
      <div class="label"><span data-lang="tr">ton</span><span data-lang="en">tone</span></div>
      <div class="primary">
        <span data-lang="tr">${this.esc(tone.tr)}</span>
        <span data-lang="en">${this.esc(tone.en)}</span>
      </div>
      <div class="conf"><span data-lang="tr">örneklem: ${t.sampleSize}</span><span data-lang="en">sample size: ${t.sampleSize}</span></div>
      <div class="bar-row">
        <span class="lbl"><span data-lang="tr">küfür</span><span data-lang="en">profanity</span></span>
        <span class="track"><span class="fill" style="width:${Math.min(100, t.profanityRate * 100 * 5).toFixed(0)}%"></span></span>
        <span class="val">${pct(t.profanityRate)}</span>
      </div>
      <div class="bar-row">
        <span class="lbl">CAPS</span>
        <span class="track"><span class="fill" style="width:${Math.min(100, t.capsRate * 100 * 2).toFixed(0)}%"></span></span>
        <span class="val">${pct(t.capsRate)}</span>
      </div>
      <div class="bar-row">
        <span class="lbl">emoji</span>
        <span class="track"><span class="fill" style="width:${Math.min(100, t.emojiRate * 100 * 10).toFixed(0)}%"></span></span>
        <span class="val">${pct(t.emojiRate)}</span>
      </div>
    </div>`;
  }

  private barBlock(): string {
    return `<div class="bar">
  <div>
    <span class="brand">echidna</span>
    <span class="doc-kind" data-lang="tr">kimlik raporu</span>
    <span class="doc-kind" data-lang="en">identity report</span>
  </div>
  <nav class="lang-switch">
    <a href="#" data-target="tr">TR</a>
    <a href="#" data-target="en">EN</a>
  </nav>
</div>`;
  }

  private headerBlock(report: LookupReport): string {
    const ts = report.fetchedAt.toISOString().replace('T', ' ').slice(0, 19);
    return `<pre class="ascii">  ┌─┐┌─┐┬ ┬┬┌┬┐┌┐┌┌─┐
  ├┤ │  ├─┤│ ││││├─┤
  └─┘└─┘┴ ┴┴─┴┘┘└┘┴ ┴   identity · cross-server profile</pre>
<div class="sub">
  <span data-lang="tr">üretildi  ${this.esc(ts)} UTC  ·  süre  ${report.durationMs} ms</span>
  <span data-lang="en">generated  ${this.esc(ts)} UTC  ·  duration  ${report.durationMs} ms</span>
</div>`;
  }

  private identityBlock(report: LookupReport): string {
    const u = report.user;
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── kimlik ───</div>
  <div class="section-title" data-lang="en">─── identity ───</div>
  <div class="kv">
    <div class="k">username</div><div class="v">${this.esc(u.username)}</div>
    <div class="k">global_name</div><div class="v ${u.globalName ? '' : 'dim'}">${this.esc(u.globalName ?? '∅')}</div>
    <div class="k">id</div><div class="v">${u.id}</div>
    <div class="k">
      <span data-lang="tr">oluşturuldu</span><span data-lang="en">created_at</span>
    </div>
    <div class="v">${u.createdAt.toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
    <div class="k">
      <span data-lang="tr">yaş</span><span data-lang="en">age</span>
    </div>
    <div class="v">${u.ageDays} <span data-lang="tr">gün</span><span data-lang="en">days</span></div>
    <div class="k">
      <span data-lang="tr">bot hesabı</span><span data-lang="en">bot account</span>
    </div>
    <div class="v ${u.isBot ? 'warn' : 'dim'}">${u.isBot ? 'YES ⚠' : 'no'}</div>
    <div class="k">avatar</div><div class="v dim">${u.avatarUrl ? this.esc(u.avatarUrl) : '∅'}</div>
  </div>
</div>`;
  }

  private aliasBlock(aliases: AliasEntry[]): string {
    const items =
      aliases.length === 0
        ? '<div class="empty"><span data-lang="tr">takma ad bulunamadı</span><span data-lang="en">no aliases found</span></div>'
        : aliases
            .map(
              (a) =>
                `<span class="alias">${this.esc(a.value)}<span class="sources">×${a.sources.length}</span></span>`,
            )
            .join('');
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── takma adlar (${aliases.length}) ───</div>
  <div class="section-title" data-lang="en">─── aliases (${aliases.length}) ───</div>
  <div>${items}</div>
  ${
    aliases.length > 0
      ? `<div style="margin-top:10px;font-size:11px;color:#9ca3af">
    <span data-lang="tr">×N: kullanıcının bu adı kaç farklı yerde (kullanıcı adı, global, sunucu nickname) görüldüğü</span>
    <span data-lang="en">×N: number of distinct sources where this alias appeared (username, global, server nicknames)</span>
  </div>`
      : ''
  }
</div>`;
  }

  private profileBlock(p: ProfileExtras): string {
    const conns = p.connections
      .map(
        (c) =>
          `<span class="tag ${c.verified ? '' : 'blood'}">${this.esc(c.type)}: ${this.esc(c.name)}${c.verified ? ' ✓' : ''}</span>`,
      )
      .join('');
    const badges = p.badges.map((b) => `<span class="tag badge">${this.esc(b)}</span>`).join('');
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── profil ───</div>
  <div class="section-title" data-lang="en">─── profile ───</div>
  <div class="kv">
    <div class="k">bio</div><div class="v ${p.bio ? '' : 'dim'}">${this.esc(p.bio ?? '∅')}</div>
    <div class="k">premium</div><div class="v ${p.premiumType ? '' : 'dim'}">${this.esc(p.premiumType ?? '∅')}</div>
    <div class="k">
      <span data-lang="tr">rozetler</span><span data-lang="en">badges</span>
    </div>
    <div class="v">${badges || '<span class="dim">∅</span>'}</div>
    <div class="k">
      <span data-lang="tr">bağlantılar</span><span data-lang="en">connections</span>
    </div>
    <div class="v">${conns || '<span class="dim">∅</span>'}</div>
  </div>
</div>`;
  }

  private guildClassificationBlock(report: LookupReport): string {
    if (report.memberships.length === 0) {
      return `<div class="section">
  <div class="section-title" data-lang="tr">─── ortak sunucular ───</div>
  <div class="section-title" data-lang="en">─── mutual guilds ───</div>
  <div class="empty">
    <span data-lang="tr">ortak sunucu yok — echidna bu kullanıcıyla aynı sunucuda bulunmuyor</span>
    <span data-lang="en">no mutual guilds — echidna shares no server with this user</span>
  </div>
</div>`;
    }

    // Group by category
    const groups = new Map<ServerCategory, typeof report.memberships>();
    for (const m of report.memberships) {
      const cat = classifyServer(m.guildName);
      const arr = groups.get(cat) ?? [];
      arr.push(m);
      groups.set(cat, arr);
    }

    // Sort categories by count desc, then deterministic order
    const order: ServerCategory[] = [
      'adult',
      'anime',
      'chat',
      'community',
      'gaming',
      'education',
      'dev',
      'other',
    ];
    const sections = order
      .filter((c) => groups.has(c))
      .map((cat) => {
        const list = groups.get(cat)!;
        const items = list
          .map((m) => {
            const roleCount = m.roles.length;
            const nick = m.nickname
              ? `<span class="nick">${this.esc(m.nickname)}</span>`
              : `<span class="nick" data-lang="tr">— nick yok</span><span class="nick" data-lang="en">— no nick</span>`;
            return `<div class="guild-mini">
        <span class="gn">⌬ ${this.esc(m.guildName)}</span>
        ${nick}
        <span class="role-count">${roleCount} <span data-lang="tr">rol</span><span data-lang="en">roles</span></span>
      </div>`;
          })
          .join('');
        const label = CATEGORY_LABELS[cat];
        return `<div class="cat-section">
      <h4>
        <span data-lang="tr">${this.esc(label.tr)} (${list.length})</span>
        <span data-lang="en">${this.esc(label.en)} (${list.length})</span>
      </h4>
      ${items}
    </div>`;
      });

    return `<div class="section">
  <div class="section-title" data-lang="tr">─── ortak sunucular (${report.memberships.length}) ───</div>
  <div class="section-title" data-lang="en">─── mutual guilds (${report.memberships.length}) ───</div>
  ${sections.join('\n  ')}
  <div style="margin-top:12px;font-size:11px;color:#9ca3af">
    <span data-lang="tr">detaylı yazışmalar ve ses aktivitesi için → activity raporuna bakın</span>
    <span data-lang="en">for message detail and voice activity → see the activity report</span>
  </div>
</div>`;
  }

  private footBlock(report: LookupReport): string {
    return `<div class="foot">
  <span data-lang="tr">echidna · sıfır kalıcılık · her sorguda yeniden üretilir</span>
  <span data-lang="en">echidna · zero persistence · regenerated each lookup</span>
  <br>
  <span class="dim-text">· ${report.fetchedAt.toISOString()} ·</span>
</div>`;
  }

  private esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
