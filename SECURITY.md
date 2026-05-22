# Security Policy

## Supported versions

Only the `main` branch is supported. Pinned releases are not yet published —
treat any tagged release as advisory.

## Reporting a vulnerability

If you discover a security issue (token leak path, log redaction bypass,
remote code-execution, privilege escalation in the systemd unit, dependency
CVE that materially affects this project, etc.), **please do not open a
public GitHub issue**.

Instead:

1. Open a **private security advisory** via the repository's
   `Security → Report a vulnerability` button on GitHub.
2. Provide:
   - a minimal reproducer (logs with PII redacted, code snippet),
   - the commit hash you tested against,
   - the impact you believe is realistic.
3. Allow at least **14 days** for triage before any public disclosure.

We do not run a paid bounty program. Disclosure credit will be added to the
release notes if you wish.

## Threat model — what we protect

The project's design treats the following as in-scope security concerns:

| Surface | Goal |
|---|---|
| **Discord user token** | Never written to disk, never logged. Loaded from `.env` at boot, held in memory only. |
| **Telegram bot token** | Same as above. |
| **PII inside reports** | Generated on demand, sent to Telegram as a `Buffer`, never persisted server-side. |
| **Operational logs** | Structured JSON via pino, with PII redaction (`token`, `authorization`, `userId`, `username`, `content`, `body`, headers). String fields truncated at 200 chars. |
| **Disk writes** | Blocked in production by `installDiskWriteGuard()` (monkey-patch over `fs.writeFile` / `appendFile` / `createWriteStream`) **and** kernel-level via systemd `ReadOnlyPaths=/opt/echidna`. |
| **Process privileges** | Runs as a dedicated unprivileged system user. systemd hardening (`NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp`, `CapabilityBoundingSet=`, `SystemCallFilter=@system-service`, `MemoryDenyWriteExecute`). |
| **Memory abuse** | Per-user-guild ring buffers + global LRU caps for message/voice activity. |
| **Rate abuse** | Token-bucket per scope (`lookup` 6/min, `search` capped by guild count). |
| **Admin auth** | Telegram `chat_id` whitelist, denied chat IDs are hashed in logs. |
| **HTML output** | All user-controlled fields are HTML-entity-escaped to prevent XSS when the report is opened in a browser. |

## Out of scope

- **Account bans by Discord** — running a self-bot violates Discord ToS. This
  is a *known operational risk*, not a vulnerability. See `LICENSE` for the
  full disclaimer.
- **Stolen Discord/Telegram token after host compromise** — if the host is
  rooted, all secrets are compromised. Use systemd hardening and OS
  patching as your first line of defense.
- **Third-party libraries with public CVEs** — please report upstream;
  open an issue here only if echidna's code path is materially affected.
