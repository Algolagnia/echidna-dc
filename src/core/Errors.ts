export class WeirdlookError extends Error {
  public readonly reason?: unknown;
  constructor(message: string, reason?: unknown) {
    super(message);
    this.name = new.target.name;
    this.reason = reason;
  }
}

export class ConfigError extends WeirdlookError {}
export class DiscordConnectError extends WeirdlookError {}
export class UserNotFoundError extends WeirdlookError {}
export class RateLimitedError extends WeirdlookError {
  constructor(public readonly retryAfterMs: number) {
    super(`rate limited, retry after ${retryAfterMs} ms`);
  }
}
export class UnauthorizedError extends WeirdlookError {}
export class DiskWriteForbiddenError extends WeirdlookError {}
