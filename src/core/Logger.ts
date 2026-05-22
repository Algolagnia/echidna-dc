import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const MAX_STRING_FIELD = 200;

const REDACT_PATHS = [
  // Identity & contact
  '*.userId', '*.username', '*.tag', '*.global_name', '*.globalName',
  '*.discriminator', '*.email', '*.phone', '*.id',
  'userId', 'username', 'tag', 'global_name', 'globalName',
  'discriminator', 'email', 'phone',

  // Secrets
  '*.token', '*.password', '*.secret', '*.authorization',
  'token', 'password', 'secret', 'authorization',
  'headers.authorization', 'headers.cookie',

  // Payload content
  '*.report', '*.markdown', '*.body', '*.text', '*.content',
  '*.bio', '*.banner', '*.avatar', '*.connections',
  'report', 'markdown', 'body', 'text', 'content',
  'bio', 'banner', 'avatar', 'connections',

  // Server / channel identifiers
  '*.guildId', '*.channelId', '*.nickname',
  'guildId', 'channelId', 'nickname',
];

export class Logger {
  private readonly pino: PinoLogger;

  constructor(level: LogLevel, prettyPrint = false) {
    const options: LoggerOptions = {
      level,
      base: { service: 'echidna' },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths: REDACT_PATHS, remove: true },
      formatters: {
        level: (label) => ({ level: label }),
      },
      serializers: {
        err: (e: unknown) => ({
          type: e instanceof Error ? e.constructor.name : 'Unknown',
          message:
            e instanceof Error
              ? Logger.truncate(e.message)
              : Logger.truncate(String(e)),
        }),
      },
    };

    if (prettyPrint) {
      options.transport = {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      };
    }

    this.pino = pino(options);
  }

  info(event: string, fields?: Record<string, unknown>): void {
    this.pino.info(Logger.sanitize(fields), event);
  }

  warn(event: string, fields?: Record<string, unknown>): void {
    this.pino.warn(Logger.sanitize(fields), event);
  }

  error(event: string, fields?: Record<string, unknown>): void {
    this.pino.error(Logger.sanitize(fields), event);
  }

  debug(event: string, fields?: Record<string, unknown>): void {
    this.pino.debug(Logger.sanitize(fields), event);
  }

  private static sanitize(fields?: Record<string, unknown>): Record<string, unknown> {
    if (!fields) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') {
        out[k] = Logger.truncate(v);
      } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
        out[k] = v;
      } else if (v instanceof Error) {
        out[k] = { type: v.constructor.name, message: Logger.truncate(v.message) };
      } else {
        out[k] = '[object]';
      }
    }
    return out;
  }

  private static truncate(s: string): string {
    if (s.length <= MAX_STRING_FIELD) return s;
    return `${s.slice(0, MAX_STRING_FIELD)}…`;
  }
}
