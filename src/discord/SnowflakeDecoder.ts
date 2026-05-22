const DISCORD_EPOCH_MS = 1420070400000n;

export interface DecodedSnowflake {
  createdAt: Date;
  ageMs: number;
}

export class SnowflakeDecoder {
  static isValidId(input: string): boolean {
    return /^\d{17,20}$/.test(input);
  }

  static decode(id: string | bigint, nowMs: number = Date.now()): DecodedSnowflake {
    const raw = typeof id === 'bigint' ? id : BigInt(id);
    const ms = (raw >> 22n) + DISCORD_EPOCH_MS;
    const createdAt = new Date(Number(ms));
    return { createdAt, ageMs: nowMs - createdAt.getTime() };
  }
}
