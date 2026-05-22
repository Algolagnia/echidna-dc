export type ServerCategory =
  | 'anime'
  | 'chat'
  | 'gaming'
  | 'education'
  | 'community'
  | 'dev'
  | 'adult'
  | 'other';

export const CATEGORY_LABELS: Record<ServerCategory, { tr: string; en: string }> = {
  anime: { tr: 'Anime / Manga', en: 'Anime / Manga' },
  chat: { tr: 'Sohbet', en: 'Chat' },
  gaming: { tr: 'Oyun', en: 'Gaming' },
  education: { tr: 'Eğitim', en: 'Education' },
  community: { tr: 'Topluluk', en: 'Community' },
  dev: { tr: 'Geliştirme', en: 'Development' },
  adult: { tr: '18+', en: 'Adult / 18+' },
  other: { tr: 'Diğer', en: 'Other' },
};

// Order matters: earlier patterns win. We classify by the most specific
// theme first, then fall back to broader social labels.
const PATTERNS: Array<{ cat: ServerCategory; re: RegExp }> = [
  { cat: 'adult', re: /\b(18\+|nsfw|adult|sex|porn|hentai|sikko)\b/i },
  {
    cat: 'anime',
    re: /(anime|manga|otaku|nekutai|maina|tsuki|wibu|kawai|sensei|-kun|-chan|isekai|genshin|honkai)/i,
  },
  {
    cat: 'education',
    re: /(english|hub|lang(?:uage)?|öğren|eğitim|education|class|akademi|akademik|school|tutor|study)/i,
  },
  {
    cat: 'dev',
    re: /(\btest\b|\bdev(?:elop)?\b|\bbuild\b|\bprog(?:ram)?\b|\bcode\b|coder|tech|linux|hack|git|server-?dev)/i,
  },
  // chat must come before gaming: "Sohbet & Oyun" is primarily a chat server
  // even though it contains the word "Oyun".
  // Turkish casing note: JS toLowerCase converts 'I'→'i' not 'ı', so patterns
  // must include both dotted-i and dotless-ı variants.
  {
    cat: 'chat',
    re: /(sohbet|chat|talk|kafe|space|hangout|family|aile|escape|adin|adın|ustam|gunluk|günlük|crystal|gece|geceler|night|kale|köy|koy)/i,
  },
  {
    cat: 'gaming',
    re: /(\boyun\b|gam(?:e|ing|er)|valo(?:rant)?|cs:?go|cs2|league|minecraft|fortnite|roblox|steam|wow|playstation|xbox)/i,
  },
];

export function classifyServer(name: string): ServerCategory {
  for (const { cat, re } of PATTERNS) {
    if (re.test(name)) return cat;
  }
  return 'community';
}
