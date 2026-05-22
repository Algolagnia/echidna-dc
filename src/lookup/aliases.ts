import type { LookupReport } from './LookupReport.js';

export interface AliasEntry {
  value: string;
  sources: string[]; // where this alias appeared (username, global_name, guild names)
}

/**
 * Collects every name the user has been seen under:
 *  - the username (always)
 *  - the global_name (if set and non-empty)
 *  - each per-guild nickname
 *
 * Aliases are deduplicated case-insensitively while preserving the original
 * casing of the first occurrence. Sources show where each alias came from
 * so the analyst can judge how widely it is used.
 */
export function deriveAliases(report: LookupReport): AliasEntry[] {
  const map = new Map<string, AliasEntry>();

  const add = (raw: string | null | undefined, source: string): void => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      return;
    }
    map.set(key, { value: trimmed, sources: [source] });
  };

  add(report.user.username, 'username');
  if (report.user.globalName) add(report.user.globalName, 'global_name');
  for (const m of report.memberships) {
    if (m.nickname) add(m.nickname, m.guildName);
  }

  return Array.from(map.values()).sort((a, b) => b.sources.length - a.sources.length);
}
