# Contributing

Thanks for considering a contribution. Echidna is a small, modular codebase;
the rules below keep it that way.

## Ground rules

1. **No god classes.** Each module owns one responsibility. Target ≤200 LOC.
2. **No persistent state.** Anything that lives between requests must be RAM
   only. Disk writes are blocked by `installDiskWriteGuard()` and the
   systemd `ReadOnlyPaths` directive — your code must not require them.
3. **No PII in logs.** Add new event names freely, but field payloads must
   contain only counters, identifiers we already classify as safe, or values
   that pass through `Logger.sanitize()`. Add new redaction paths to
   `src/core/Logger.ts` when in doubt.
4. **HTML escape every user-controlled field.** Reports already do this via
   `esc()` in each renderer — keep that invariant.
5. **TypeScript strict mode stays on.** All flags currently enabled in
   `tsconfig.json` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   etc.) must remain on.

## Setup

```bash
npm ci --include=dev
npm run typecheck
npm test
npm run build
```

CI runs all three on every pull request — make sure they pass locally first.

## Commit / PR conventions

- Conventional commit prefixes encouraged but not enforced
  (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
- One logical change per PR. Split unrelated work.
- Include a test for any non-trivial change to `src/`. Renderer changes need
  at least a snapshot-style assertion (palette colors, presence of a
  section, escaped output).
- Update `docs/index.html` if user-facing behavior changes.

## Anything that increases Discord ban surface

If your change involves new HTTP calls to Discord, new event subscriptions,
or any behavior that could plausibly trip self-bot detection, write a short
"ban-risk note" in the PR description that covers:

- which endpoint or pattern is now used,
- how often it fires per `/lookup`,
- whether rate limiting and per-guild delay still bound it,
- whether the behavior is one a normal Discord client would do.

PRs that fail this check are likely to be declined regardless of code
quality.

## Code of conduct

By participating you agree to abide by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
