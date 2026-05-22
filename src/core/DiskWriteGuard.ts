import { createRequire } from 'node:module';
import { DiskWriteForbiddenError } from './Errors.js';

// ESM namespace from `import * as fs from 'node:fs'` is sealed (non-configurable).
// CommonJS exports via createRequire are still mutable, so we can monkey-patch them.
const require = createRequire(import.meta.url);
const fs = require('node:fs') as Record<string, unknown>;
const fsp = require('node:fs/promises') as Record<string, unknown>;

// Only high-level path-based write APIs. Low-level fd APIs (write/writeSync/writev/writevSync)
// are also used for stdout/stderr by pino and other loggers, so blocking them breaks logging.
// Actual filesystem protection is enforced at the kernel level by systemd's ReadOnlyPaths.
const FORBIDDEN_FS_METHODS = [
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createWriteStream',
] as const;

const FORBIDDEN_FSP_METHODS = ['writeFile', 'appendFile'] as const;

function forbid(api: string, method: string): never {
  throw new DiskWriteForbiddenError(
    `disk write forbidden: ${api}.${method} called — echidna is zero-persistence`,
  );
}

let installed = false;

export function installDiskWriteGuard(): void {
  if (installed) return;
  installed = true;

  for (const method of FORBIDDEN_FS_METHODS) {
    if (typeof fs[method] === 'function') {
      try {
        fs[method] = function () {
          return forbid('fs', method);
        };
      } catch {
        // Best effort. systemd ReadOnlyPaths is the kernel-level guarantee.
      }
    }
  }

  for (const method of FORBIDDEN_FSP_METHODS) {
    if (typeof fsp[method] === 'function') {
      try {
        fsp[method] = function () {
          return Promise.reject(
            new DiskWriteForbiddenError(`disk write forbidden: fs/promises.${method}`),
          );
        };
      } catch {
        // Best effort.
      }
    }
  }
}
