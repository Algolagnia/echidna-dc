# Third-Party Notices

Echidna depends on the following open-source packages. All are compatible
with the MIT license under which echidna itself is released.

## Runtime dependencies

| Package | License | Purpose |
|---|---|---|
| [discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) | Apache-2.0 | Discord gateway/REST client (self-bot) |
| [grammy](https://github.com/grammyjs/grammY) | MIT | Telegram bot framework |
| [pino](https://github.com/pinojs/pino) | MIT | Structured JSON logging |
| [zod](https://github.com/colinhacks/zod) | MIT | Runtime schema validation |
| [dotenv](https://github.com/motdotla/dotenv) | BSD-2-Clause | `.env` file loader |

## Development dependencies

| Package | License | Purpose |
|---|---|---|
| [typescript](https://github.com/microsoft/TypeScript) | Apache-2.0 | Compiler |
| [vitest](https://github.com/vitest-dev/vitest) | MIT | Test runner |
| [pino-pretty](https://github.com/pinojs/pino-pretty) | MIT | Development-mode log formatter |
| [@types/node](https://www.npmjs.com/package/@types/node) | MIT | Node.js type definitions |

Each license text is preserved in the corresponding package's directory
under `node_modules/`. Refer to those files for the full terms.

## Note on `discord.js-selfbot-v13`

This dependency exists in a legal/operational gray area. Its README marks
the package as "no longer supported" — meaning the maintainer no longer
actively backports Discord protocol changes. The package is still
functional as of writing, but echidna may need to be migrated to a fork
(such as `discord.js-selfbot-v14`) in the future.

Using this dependency is what causes echidna to violate Discord's Terms of
Service. See [DISCLAIMER.md](DISCLAIMER.md).
