import type { LookupReport } from '../lookup/LookupReport.js';
import { deriveAliases } from '../lookup/aliases.js';

/**
 * Telegram summary message — retro terminal aesthetic using box-drawing.
 * Kept under ~3500 chars to fit Telegram's caption limit when sent with a document.
 * Two HTML reports (identity + activity) are attached separately.
 */
export class MarkdownFormatter {
  format(report: LookupReport): string {
    const u = report.user;
    const totalMessages = report.activity.reduce((s, a) => s + a.messages.totalCount, 0);
    const aliases = deriveAliases(report);
    const liveVoice = report.memberships.find((m) => m.voice !== null);

    const lines: string[] = [];
    lines.push('```');
    lines.push('┌────────────────────────────────────────┐');
    lines.push('│  echidna · lookup report               │');
    lines.push('└────────────────────────────────────────┘');
    lines.push('');
    lines.push('  TARGET');
    lines.push('  ───────────────────────────────────────');
    lines.push(`  username   ${this.truncate(u.username, 28)}`);
    lines.push(`  global     ${this.truncate(u.globalName ?? '∅', 28)}`);
    lines.push(`  id         ${u.id}`);
    lines.push(`  created    ${u.createdAt.toISOString().slice(0, 10)}  (${u.ageDays}d)`);
    if (u.isBot) lines.push(`  flag       BOT ACCOUNT ⚠`);
    lines.push('');

    if (aliases.length > 0) {
      lines.push(`  ALIASES (${aliases.length})`);
      lines.push('  ───────────────────────────────────────');
      const aliasLine = aliases
        .slice(0, 8)
        .map((a) => this.truncate(a.value, 18))
        .join(', ');
      const more = aliases.length > 8 ? ` +${aliases.length - 8}` : '';
      lines.push(`  ${aliasLine}${more}`);
      lines.push('');
    }

    if (liveVoice && liveVoice.voice) {
      lines.push('  LIVE VOICE');
      lines.push('  ───────────────────────────────────────');
      lines.push(
        `  ⏵ ${this.truncate(liveVoice.guildName, 22)} → ${this.truncate(liveVoice.voice.channelName, 14)}`,
      );
      lines.push('');
    }

    lines.push('  SUMMARY');
    lines.push('  ───────────────────────────────────────');
    lines.push(`  mutual guilds   ${report.mutualGuildCount}`);
    lines.push(`  messages seen   ${totalMessages}`);
    if (report.profileExtras) {
      const conns = report.profileExtras.connections.length;
      const badges = report.profileExtras.badges.length;
      lines.push(`  connections     ${conns}`);
      lines.push(`  badges          ${badges}`);
    }
    lines.push(`  confidence      ${report.confidence.score}/100 (${report.confidence.band})`);
    lines.push('');

    if (report.risk.totalFlagged > 0) {
      lines.push('  ⚠ RISK FLAGS');
      lines.push('  ───────────────────────────────────────');
      lines.push(
        `  high ${report.risk.highSeverityCount}  ·  med ${report.risk.mediumSeverityCount}  ·  low ${report.risk.lowSeverityCount}  ·  total ${report.risk.totalFlagged}`,
      );
      lines.push('  (detay identity raporunda)');
      lines.push('');
    }

    {
      const b = report.behavioral;
      lines.push('  BEHAVIOR');
      lines.push('  ───────────────────────────────────────');
      lines.push(`  language        ${b.language.primary}`);
      if (b.age.estimate !== null) {
        lines.push(`  age estimate    ${b.age.estimate} (${b.age.confidence})`);
      }
      if (b.gender.estimate !== 'unknown') {
        lines.push(`  gender hint     ${b.gender.estimate} (${b.gender.confidence})`);
      }
      lines.push(`  tone            ${b.tone.overall}`);
      lines.push('');
    }
    lines.push('  ───────────────────────────────────────');
    lines.push(`  ${report.durationMs} ms  ·  2 reports attached ↓↓`);
    lines.push('```');

    return lines.join('\n');
  }

  private truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }
}
