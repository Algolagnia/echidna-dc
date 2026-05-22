import { describe, expect, it } from 'vitest';
import { SnowflakeDecoder } from '../src/discord/SnowflakeDecoder.js';

describe('SnowflakeDecoder', () => {
  it('decodes a known snowflake correctly', () => {
    // Discord snowflake 175928847299117063 was created 2016-04-30 11:18:25.796 UTC
    const result = SnowflakeDecoder.decode('175928847299117063');
    expect(result.createdAt.toISOString()).toBe('2016-04-30T11:18:25.796Z');
  });

  it('handles bigint input', () => {
    const result = SnowflakeDecoder.decode(175928847299117063n);
    expect(result.createdAt.getFullYear()).toBe(2016);
  });

  it('rejects invalid ID formats', () => {
    expect(SnowflakeDecoder.isValidId('abc')).toBe(false);
    expect(SnowflakeDecoder.isValidId('123')).toBe(false);
    expect(SnowflakeDecoder.isValidId('12345678901234567')).toBe(true);
    expect(SnowflakeDecoder.isValidId('123456789012345678901')).toBe(false);
  });

  it('returns positive age for past snowflake', () => {
    const result = SnowflakeDecoder.decode('175928847299117063', Date.now());
    expect(result.ageMs).toBeGreaterThan(0);
  });
});
