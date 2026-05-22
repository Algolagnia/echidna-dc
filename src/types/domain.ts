export interface DiscordUserSnapshot {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
  isBot: boolean;
  createdAt: Date;
  ageDays: number;
}

export interface VoiceStateSnapshot {
  channelName: string;
  selfMute: boolean;
  selfDeaf: boolean;
  serverMute: boolean;
  serverDeaf: boolean;
  streaming: boolean;
  video: boolean;
}

export interface ActivitySnapshot {
  type: string;
  name: string;
  details: string | null;
}

export interface GuildMembershipSnapshot {
  guildId: string;
  guildName: string;
  nickname: string | null;
  joinedAt: Date | null;
  premiumSince: Date | null;
  roles: string[];
  voice: VoiceStateSnapshot | null;
  activities: ActivitySnapshot[];
  status: string | null;
}

export interface ConnectionSnapshot {
  type: string;
  name: string;
  verified: boolean;
}

export interface ProfileExtras {
  bio: string | null;
  badges: string[];
  premiumType: string | null;
  connections: ConnectionSnapshot[];
}

// ─── Activity tracking (RAM cache, rolling) ───────────────────────────────────

export interface MessageSampleEntry {
  channelId: string;
  channelName: string;
  at: Date;
  contentPreview: string;
}

export interface ChannelMessageStat {
  channelId: string;
  channelName: string;
  count: number;
  lastAt: Date;
}

export interface MessageActivityStats {
  totalCount: number;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  uniqueChannels: number;
  perChannel: ChannelMessageStat[];
  recentSamples: MessageSampleEntry[];
  /**
   * Discord's own total_results figure from the search endpoint, if available.
   * Lets the report show "showing N of M" so the analyst can tell when
   * results were truncated by SEARCH_PAGES_PER_GUILD.
   */
  discordTotalDiscoverable: number | null;
}

export interface VoiceSessionEntry {
  channelId: string;
  channelName: string;
  joinedAt: Date;
  leftAt: Date | null;
  durationSeconds: number;
}

export interface ChannelVoiceStat {
  channelId: string;
  channelName: string;
  totalSeconds: number;
  sessionCount: number;
}

export interface VoiceActivityStats {
  totalSeconds: number;
  sessionCount: number;
  longestSessionSeconds: number;
  perChannel: ChannelVoiceStat[];
  currentSession: {
    channelName: string;
    joinedAt: Date;
    durationSeconds: number;
  } | null;
  recentSessions: VoiceSessionEntry[];
}

export interface GuildActivitySummary {
  guildId: string;
  guildName: string;
  messages: MessageActivityStats;
  voice: VoiceActivityStats;
}

// ─── Risk / scam pattern detection (A2) ───────────────────────────────────────

export type RiskCategory =
  | 'phishing-url'
  | 'nitro-scam'
  | 'token-grabber'
  | 'mass-mention'
  | 'suspicious-link'
  | 'invite-spam'
  | 'crypto-scam';

export type RiskSeverity = 'low' | 'medium' | 'high';

export interface RiskFlag {
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  /** Truncated message preview that triggered the flag. */
  evidence: string;
  guildId: string;
  guildName: string;
  channelName: string;
  at: Date;
}

export interface RiskAssessment {
  flags: RiskFlag[];
  totalFlagged: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
}

// ─── Behavioral / NLP profile (D1) ────────────────────────────────────────────

export type LanguageHint = 'tr' | 'en' | 'ar' | 'ru' | 'de' | 'es' | 'fr' | 'unknown';

export interface LanguageBreakdown {
  primary: LanguageHint;
  distribution: Array<{ lang: LanguageHint; ratio: number }>;
  sampleSize: number;
}

export type EvidenceConfidence = 'low' | 'medium' | 'high';

export interface AgeHint {
  estimate: number | null;
  confidence: EvidenceConfidence;
  evidence: string[];
}

export type GenderEstimate = 'male' | 'female' | 'other' | 'unknown';

export interface GenderHint {
  estimate: GenderEstimate;
  confidence: EvidenceConfidence;
  evidence: string[];
}

export type ToneOverall = 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown';

export interface ToneProfile {
  overall: ToneOverall;
  profanityRate: number; // 0..1
  capsRate: number;
  emojiRate: number;
  sampleSize: number;
}

export interface BehavioralProfile {
  language: LanguageBreakdown;
  age: AgeHint;
  gender: GenderHint;
  tone: ToneProfile;
}

// ─── Confidence score (B5) ────────────────────────────────────────────────────

export interface ConfidenceFactor {
  factor: string;
  contribution: number;
  max: number;
  note: string;
}

export interface ConfidenceScore {
  score: number; // 0..100
  band: 'low' | 'medium' | 'high' | 'very-high';
  factors: ConfidenceFactor[];
}
