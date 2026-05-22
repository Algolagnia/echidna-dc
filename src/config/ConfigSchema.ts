import { z } from 'zod';

const csvNumbers = z
  .string()
  .min(1)
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(z.string().regex(/^-?\d+$/).transform((s) => BigInt(s))).min(1));

const boolish = z
  .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === true || v === 'true' || v === '1');

export const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(20, 'DISCORD_TOKEN missing or too short'),
  TELEGRAM_BOT_TOKEN: z.string().min(20, 'TELEGRAM_BOT_TOKEN missing or too short'),
  ADMIN_CHAT_IDS: csvNumbers,
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Telegram-side rate limit (applies to /lookup)
  RATE_LIMIT_LOOKUP_PER_MIN: z.coerce.number().int().positive().default(6),

  // Discord startup behavior
  CHUNK_GUILDS_AT_STARTUP: boolish.default(true),

  // RAM cache caps (rolling, no disk)
  MSG_CACHE_PER_USER_GUILD: z.coerce.number().int().positive().default(500),
  MSG_CACHE_TOTAL: z.coerce.number().int().positive().default(50_000),
  VOICE_SESSIONS_PER_USER_GUILD: z.coerce.number().int().positive().default(100),
  VOICE_SESSIONS_TOTAL: z.coerce.number().int().positive().default(10_000),

  // Search API on /lookup
  SEARCH_ON_LOOKUP: boolish.default(true),
  SEARCH_PAGES_PER_GUILD: z.coerce.number().int().positive().max(20).default(4),
  SEARCH_DELAY_BETWEEN_GUILDS_MS: z.coerce.number().int().min(0).default(1500),
  SEARCH_DELAY_BETWEEN_PAGES_MS: z.coerce.number().int().min(0).default(500),
  SEARCH_MAX_GUILDS: z.coerce.number().int().positive().default(50),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

export type Config = z.infer<typeof ConfigSchema>;
