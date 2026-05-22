# echidna

> Discord OSINT lookup tool with a Telegram interface — passive observer,
> zero persistence, modular analysis (scam flags, NLP, confidence score).

[![CI](https://github.com/Algolagnia/echidna-dc/actions/workflows/ci.yml/badge.svg)](https://github.com/Algolagnia/echidna-dc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen)](#requirements)
[![TypeScript strict](https://img.shields.io/badge/typescript-strict-blue)](tsconfig.json)

> [!CAUTION]
> **Self-bot usage violates Discord's Terms of Service.** This tool exists
> for community-moderation OSINT research and is provided as-is. Read
> [DISCLAIMER.md](DISCLAIMER.md) **before** cloning. The authors disclaim
> liability for account bans, civil suits, GDPR/KVKK/CCPA violations, or any
> misuse of generated reports.

## What it does

Given a Discord user ID, echidna assembles a moderation report that fuses:

- **Identity** — username, global name, avatar, account age (snowflake-derived)
- **Aliases** — every name the user has been seen under, case-insensitive
  deduped across username / global name / per-server nicknames
- **Mutual servers** — classified into 7 categories (anime, chat, gaming,
  education, community, dev, 18+, other), with roles and join dates
- **Messages** — pulled live via Discord's own search endpoint, capped per
  guild, with "showing N of M" transparency on truncation
- **Live voice state** — currently in voice? where? for how long?
- **Profile extras** — bio, badges, premium type, connected accounts
  (GitHub, Steam, Twitch, …)
- **Risk scan** — local regex over 7 categories (Nitro phishing, Steam
  look-alike domains, token grabbers, crypto scams, mass-mention, URL
  shorteners, invite spam)
- **Behavioral profile** — language detection (TR/EN/AR/RU/DE/ES/FR), age
  estimate from self-mentions, gender hint from role tags, tone analysis
  (profanity / caps / emoji rates)
- **Confidence score** — 0-100, six factors, transparent breakdown

The report is delivered to an authenticated admin chat on Telegram as two
self-contained HTML files (identity + activity). The data is then discarded
from memory.

## Requirements

- Node.js **22 LTS** or newer
- A Linux host (Debian/Ubuntu recommended) — local VM, Raspberry Pi, mini PC
- A residential IP (cloud VMs use datacenter ranges that Discord flags)
- A throwaway Discord account that is **≥30 days old** with 2FA
- A Telegram bot (BotFather) and your admin chat ID (`@userinfobot`)

## Quickstart

```bash
git clone https://github.com/Algolagnia/echidna-dc.git echidna
cd echidna
npm ci --include=dev
cp .env.example .env
nano .env       # fill DISCORD_TOKEN, TELEGRAM_BOT_TOKEN, ADMIN_CHAT_IDS
chmod 600 .env
npm run build
npm test        # all green
npm start
```

Full step-by-step guide (Discord token extraction, Telegram BotFather,
systemd hardening, VM/cloud comparison): open **[docs/index.html](docs/index.html) · [live site](https://algolagnia.github.io/echidna-dc/)**
in a browser. Bilingual TR/EN.

## Telegram commands

| Command | Effect |
|---|---|
| `/lookup <discord_id>` | Complete report. Returns two HTML attachments + a text summary. |
| `/status` | Service health, cache sizes, uptime. |
| `/help` | Command reference. |

## Architecture

```
src/
├── index.ts                # composition root — no logic, just wires
├── config/                 # zod-validated environment
├── core/                   # Logger, RateLimiter, Clock, Errors, DiskWriteGuard
├── discord/                # Client, GuildScanner, ProfileFetcher,
│                           # MessageSearcher, ActivityCollectors, Snowflake
├── telegram/               # Bot, AuthMiddleware, CommandRouter, MessageChunker
├── analysis/               # PatternDetector, NlpAnalyzer, ConfidenceCalculator
├── lookup/                 # LookupService, UnifiedLookupStrategy,
│                           # aliases, serverClassifier
├── report/                 # MarkdownFormatter, IdentityReportRenderer,
│                           # ActivityReportRenderer, theme
└── types/                  # domain types
```

No god class, no global state, constructor injection throughout. The full
class graph is one screen of `src/index.ts`.

## Security & privacy posture

- **Zero persistence.** No database, no log files for user data, no disk
  writes in production (enforced by `installDiskWriteGuard()` + systemd
  `ReadOnlyPaths=/opt/echidna`).
- **Token redaction.** Logger redact paths cover `token`, `authorization`,
  `userId`, `username`, `body`, `content`, `connections`, `headers.cookie`.
  Strings auto-truncated to 200 chars.
- **Rate limits.** 6 `/lookup`/minute by default; per-guild search delay
  1500ms; per-page delay 500ms. Bounded by `SEARCH_MAX_GUILDS` per request.
- **HTML escape** on every user-controlled field in both renderers (XSS
  hardened).
- **systemd hardening.** Unit ships with `NoNewPrivileges`,
  `ProtectSystem=strict`, `PrivateTmp`, `CapabilityBoundingSet=`,
  `SystemCallFilter=@system-service`, `MemoryDenyWriteExecute`,
  `MemoryMax=768M`, `LimitCORE=0`. Target `systemd-analyze security` score
  ≤ 2.0.

Full threat model in [SECURITY.md](SECURITY.md).

## Documentation

- [docs/index.html](docs/index.html) · [live site](https://algolagnia.github.io/echidna-dc/) — full bilingual user guide
  (open in a browser)
- [SECURITY.md](SECURITY.md) — threat model, vulnerability reporting
- [DISCLAIMER.md](DISCLAIMER.md) — legal & ethical obligations
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to send a PR
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community rules
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — dependency licenses

## License

[MIT](LICENSE) — with the ToS notice appended at the end of the license
file. Read it.
