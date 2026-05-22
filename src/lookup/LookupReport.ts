import type {
  BehavioralProfile,
  ConfidenceScore,
  DiscordUserSnapshot,
  GuildActivitySummary,
  GuildMembershipSnapshot,
  ProfileExtras,
  RiskAssessment,
} from '../types/domain.js';

export interface LookupReport {
  user: DiscordUserSnapshot;
  memberships: GuildMembershipSnapshot[];
  activity: GuildActivitySummary[];
  profileExtras: ProfileExtras | null;
  mutualGuildCount: number;
  durationMs: number;
  fetchedAt: Date;
  fromCache: boolean; // true if user was found via mutual guilds (no API call)

  // New analysis layers
  risk: RiskAssessment;
  behavioral: BehavioralProfile;
  confidence: ConfidenceScore;
}
