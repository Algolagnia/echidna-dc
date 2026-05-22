import 'dotenv/config';
import { ConfigError } from '../core/Errors.js';
import { type Config, ConfigSchema } from './ConfigSchema.js';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new ConfigError(`invalid configuration: ${issues}`);
  }
  return parsed.data;
}
