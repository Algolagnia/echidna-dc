<!-- One logical change per PR. Split unrelated work. -->

## Summary

<!-- 1-3 lines. What does this change? -->

## Checklist

- [ ] `npm run typecheck` passes locally
- [ ] `npm test` passes locally (and tests added for non-trivial changes)
- [ ] `npm run build` produces a clean `dist/`
- [ ] No new persistent state added (RAM only is the rule)
- [ ] No PII added to logger payloads
- [ ] HTML output is escaped (`esc()`) wherever user-controlled fields appear
- [ ] If user-facing behavior changed, `docs/index.html` updated

## Ban-risk note (required for any new Discord API call or gateway event)

<!--
Which endpoint? How often per /lookup? Bounded by rate limits & per-guild
delay? Would a normal Discord desktop client behave this way?

If this PR doesn't touch the Discord client surface, write "n/a".
-->

## Related issues

<!-- e.g. Closes #42 -->
