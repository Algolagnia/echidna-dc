import type { LookupReport } from '../lookup/LookupReport.js';
import type {
  GuildActivitySummary,
  GuildMembershipSnapshot,
  MessageSampleEntry,
} from '../types/domain.js';
import {
  classifyServer,
  CATEGORY_LABELS,
} from '../lookup/serverClassifier.js';
import { LANG_SWITCH_SCRIPT, SHARED_CSS } from './theme.js';

/**
 * Activity report — message-centric.
 *
 * Sections:
 *  - live voice state (only voice-related section kept)
 *  - message summary (totals across all guilds)
 *  - per-guild detail with the COMPLETE list of captured messages
 *
 * Voice summary/history is deliberately omitted; only the "live voice state"
 * snapshot is shown at the top.
 */
export class ActivityReportRenderer {
  render(report: LookupReport): string {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>echidna · ${this.esc(report.user.username)} · activity</title>
<style>${SHARED_CSS}</style>
</head>
<body>
<div class="frame">
${this.barBlock()}
${this.headerBlock(report)}
${this.miniIdentity(report)}
${this.liveVoiceBlock(report)}
${this.messageSummaryBlock(report)}
${this.guildsBlock(report)}
${this.footBlock(report)}
</div>
<script>${LANG_SWITCH_SCRIPT}</script>
</body>
</html>`;
  }

  private barBlock(): string {
    return `<div class="bar">
  <div>
    <span class="brand">echidna</span>
    <span class="doc-kind" data-lang="tr">aktivite raporu</span>
    <span class="doc-kind" data-lang="en">activity report</span>
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
  └─┘└─┘┴ ┴┴─┴┘┘└┘┴ ┴   activity · messages</pre>
<div class="sub">
  <span data-lang="tr">üretildi  ${this.esc(ts)} UTC  ·  süre  ${report.durationMs} ms  ·  cache  ${report.fromCache ? 'evet' : 'hayır'}</span>
  <span data-lang="en">generated  ${this.esc(ts)} UTC  ·  duration  ${report.durationMs} ms  ·  from-cache  ${report.fromCache ? 'yes' : 'no'}</span>
</div>`;
  }

  private miniIdentity(report: LookupReport): string {
    const u = report.user;
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── hedef ───</div>
  <div class="section-title" data-lang="en">─── target ───</div>
  <div class="kv">
    <div class="k">username</div><div class="v">${this.esc(u.username)}</div>
    <div class="k">global_name</div><div class="v ${u.globalName ? '' : 'dim'}">${this.esc(u.globalName ?? '∅')}</div>
    <div class="k">id</div><div class="v">${u.id}</div>
    <div class="k">
      <span data-lang="tr">yaş</span><span data-lang="en">age</span>
    </div>
    <div class="v">${u.ageDays} <span data-lang="tr">gün</span><span data-lang="en">days</span></div>
  </div>
</div>`;
  }

  /** The only voice-related section kept: a real-time snapshot of whether
   *  the user is in a voice channel right now and where. */
  private liveVoiceBlock(report: LookupReport): string {
    const liveFromMembership = report.memberships.find((m) => m.voice !== null);
    const liveFromActivity = report.activity.find((a) => a.voice.currentSession !== null);

    if (!liveFromMembership && !liveFromActivity) {
      return `<div class="section">
  <div class="section-title blood" data-lang="tr">─── canlı ses durumu ───</div>
  <div class="section-title blood" data-lang="en">─── live voice state ───</div>
  <div class="empty">
    <span data-lang="tr">kullanıcı şu an hiçbir sunucuda ses kanalında değil</span>
    <span data-lang="en">user is not in any voice channel right now</span>
  </div>
</div>`;
    }

    const m = liveFromMembership;
    const a = liveFromActivity ?? (m ? report.activity.find((x) => x.guildId === m.guildId) : undefined);
    const ongoing = a?.voice.currentSession;
    const guildName = m?.guildName ?? a?.guildName ?? '?';
    const channelName = m?.voice?.channelName ?? ongoing?.channelName ?? '?';
    const duration = ongoing ? this.fmtDuration(ongoing.durationSeconds) : '<1m';

    const flags: string[] = [];
    if (m?.voice?.selfMute) flags.push('mute');
    if (m?.voice?.selfDeaf) flags.push('deaf');
    if (m?.voice?.streaming) flags.push('stream');
    if (m?.voice?.video) flags.push('camera');
    const flagsStr = flags.length > 0 ? `[${flags.join(', ')}]` : '';

    return `<div class="section">
  <div class="section-title blood" data-lang="tr">─── canlı ses durumu ───</div>
  <div class="section-title blood" data-lang="en">─── live voice state ───</div>
  <div class="voice-now">
    <span class="dot"></span>
    <span data-lang="tr">şu anda sunucuda:</span>
    <span data-lang="en">currently in:</span>
    <span class="where"> ${this.esc(guildName)} → ${this.esc(channelName)}</span>
    <span class="dur"> · ${duration}</span>
    ${flagsStr ? `<span class="flags">${this.esc(flagsStr)}</span>` : ''}
  </div>
  <div style="margin-top:10px;font-size:11px;color:#9ca3af">
    <span data-lang="tr">not: süre echidna'nın kullanıcıyı seste gördüğü andan itibarendir, gerçek katılım zamanı bilinmiyor</span>
    <span data-lang="en">note: duration starts when echidna first saw the user in voice; their true join time is unknown</span>
  </div>
</div>`;
  }

  private messageSummaryBlock(report: LookupReport): string {
    const totalMessages = report.activity.reduce((s, a) => s + a.messages.totalCount, 0);
    const allChannels = new Set<string>();
    let lastSeen: Date | null = null;
    for (const a of report.activity) {
      for (const c of a.messages.perChannel) allChannels.add(c.channelId);
      if (a.messages.lastSeenAt && (!lastSeen || a.messages.lastSeenAt > lastSeen)) {
        lastSeen = a.messages.lastSeenAt;
      }
    }
    const lastSeenStr = lastSeen
      ? lastSeen.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      : '∅';
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── mesaj özeti ───</div>
  <div class="section-title" data-lang="en">─── message summary ───</div>
  <div class="meta-grid">
    <div class="meta">
      <div class="label" data-lang="tr">toplam mesaj</div>
      <div class="label" data-lang="en">total messages</div>
      <div class="value">${totalMessages}</div>
    </div>
    <div class="meta">
      <div class="label" data-lang="tr">farklı kanal</div>
      <div class="label" data-lang="en">unique channels</div>
      <div class="value">${allChannels.size}</div>
    </div>
    <div class="meta">
      <div class="label" data-lang="tr">son aktivite</div>
      <div class="label" data-lang="en">last seen</div>
      <div class="value" style="font-size:13px">${this.esc(lastSeenStr)}</div>
    </div>
  </div>
</div>`;
  }

  private guildsBlock(report: LookupReport): string {
    if (report.memberships.length === 0) {
      return `<div class="section">
  <div class="section-title" data-lang="tr">─── sunucular ───</div>
  <div class="section-title" data-lang="en">─── per-guild ───</div>
  <div class="empty">
    <span data-lang="tr">ortak sunucu yok</span>
    <span data-lang="en">no mutual guilds</span>
  </div>
</div>`;
    }

    const sorted = [...report.memberships].sort((a, b) => {
      const ma = report.activity.find((x) => x.guildId === a.guildId);
      const mb = report.activity.find((x) => x.guildId === b.guildId);
      return (mb?.messages.totalCount ?? 0) - (ma?.messages.totalCount ?? 0);
    });
    const blocks = sorted.map((m) => {
      const a = report.activity.find((x) => x.guildId === m.guildId);
      return this.guildBlock(m, a);
    });
    return `<div class="section">
  <div class="section-title" data-lang="tr">─── sunucu detayları (${report.memberships.length}) ───</div>
  <div class="section-title" data-lang="en">─── per-guild detail (${report.memberships.length}) ───</div>
  ${blocks.join('\n  ')}
</div>`;
  }

  private guildBlock(
    m: GuildMembershipSnapshot,
    a: GuildActivitySummary | undefined,
  ): string {
    const cat = classifyServer(m.guildName);
    const catLabel = CATEGORY_LABELS[cat];

    const roles =
      m.roles.length > 0
        ? m.roles.map((r) => `<span class="tag role">${this.esc(r)}</span>`).join('')
        : '<span data-lang="tr">rol yok</span><span data-lang="en">no roles</span>';

    const meta: string[] = [];
    if (m.nickname)
      meta.push(`nick: <strong class="accent">${this.esc(m.nickname)}</strong>`);
    if (m.joinedAt)
      meta.push(
        `<span data-lang="tr">katıldı</span><span data-lang="en">joined</span>: ${m.joinedAt.toISOString().slice(0, 10)}`,
      );
    if (m.premiumSince)
      meta.push(
        `<span data-lang="tr">boost</span><span data-lang="en">boost since</span>: ${m.premiumSince.toISOString().slice(0, 10)}`,
      );
    if (m.status && m.status !== 'offline')
      meta.push(
        `<span data-lang="tr">durum</span><span data-lang="en">status</span>: <strong>${this.esc(m.status)}</strong>`,
      );
    if (m.activities.length > 0) {
      const act = m.activities
        .slice(0, 2)
        .map((x) => `${this.esc(x.type)}: ${this.esc(x.name)}`)
        .join(' · ');
      meta.push(act);
    }

    const messagesHtml = a
      ? this.messagesPanel(a)
      : `<div class="empty"><span data-lang="tr">aktivite verisi yok</span><span data-lang="en">no activity data</span></div>`;

    return `<div class="guild cat-${cat}">
    <div class="name">
      <span>⌬ ${this.esc(m.guildName)}</span>
      <span class="cat-tag">
        <span data-lang="tr">${this.esc(catLabel.tr)}</span>
        <span data-lang="en">${this.esc(catLabel.en)}</span>
      </span>
    </div>
    <div class="role-list">${meta.join('  ·  ')}</div>
    <div class="role-list">${roles}</div>
    ${messagesHtml}
  </div>`;
  }

  private messagesPanel(a: GuildActivitySummary): string {
    const m = a.messages;

    const channelRows = m.perChannel
      .map(
        (c) =>
          `<div class="row"><span>#${this.esc(c.channelName)}</span><span>${c.count} <span data-lang="tr">mesaj</span><span data-lang="en">msg</span></span></div>`,
      )
      .join('');

    const samples =
      m.recentSamples.length > 0
        ? `<div class="samples">${m.recentSamples
            .map((s) => this.sampleRow(s, true))
            .join('')}</div>`
        : '';

    // "Showing N of M" hint when Discord reports more results than we paginated.
    let truncationHint = '';
    if (
      m.discordTotalDiscoverable !== null &&
      m.discordTotalDiscoverable > m.totalCount
    ) {
      const missing = m.discordTotalDiscoverable - m.totalCount;
      truncationHint = `<div class="trunc">
        <span data-lang="tr">⚠ gösterilen ${m.totalCount}, Discord'da toplam ${m.discordTotalDiscoverable} (${missing} mesaj sayfa limiti dışında — SEARCH_PAGES_PER_GUILD artır)</span>
        <span data-lang="en">⚠ showing ${m.totalCount} of ${m.discordTotalDiscoverable} on Discord (${missing} beyond page limit — raise SEARCH_PAGES_PER_GUILD)</span>
      </div>`;
    } else if (m.discordTotalDiscoverable !== null) {
      truncationHint = `<div class="trunc ok">
        <span data-lang="tr">✓ Discord'daki tüm ${m.discordTotalDiscoverable} mesaj alındı</span>
        <span data-lang="en">✓ all ${m.discordTotalDiscoverable} Discord results retrieved</span>
      </div>`;
    }

    return `<div class="message-panel">
      <div class="panel-label">
        <span data-lang="tr">─ mesajlar (${m.totalCount}) ─</span>
        <span data-lang="en">─ messages (${m.totalCount}) ─</span>
      </div>
      <div class="nums ${m.uniqueChannels === 0 ? 'dim' : ''}">
        <span data-lang="tr">farklı kanal: ${m.uniqueChannels}</span>
        <span data-lang="en">unique channels: ${m.uniqueChannels}</span>
      </div>
      <div class="nums ${m.lastSeenAt ? '' : 'dim'}">
        <span data-lang="tr">son: ${m.lastSeenAt ? m.lastSeenAt.toISOString().slice(0, 19).replace('T', ' ') : '∅'}</span>
        <span data-lang="en">last: ${m.lastSeenAt ? m.lastSeenAt.toISOString().slice(0, 19).replace('T', ' ') : '∅'}</span>
      </div>
      ${truncationHint}
      <div class="channels">${channelRows || `<div class="empty"><span data-lang="tr">yazışma yok</span><span data-lang="en">no messages</span></div>`}</div>
      ${samples}
    </div>`;
  }

  private sampleRow(s: MessageSampleEntry, full = false): string {
    const cls = full ? 'sample full' : 'sample';
    return `<div class="${cls}">
      <span class="at">${s.at.toISOString().slice(0, 19).replace('T', ' ')}</span>
      <span class="ch">#${this.esc(s.channelName)}</span>
      <span class="txt">${this.esc(s.contentPreview || '∅')}</span>
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

  private fmtDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
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
