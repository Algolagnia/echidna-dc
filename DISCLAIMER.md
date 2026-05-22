# Disclaimer

> **Read this before cloning, building, or running echidna.**

## What this software does

Echidna operates a Discord **user account** ("self-bot") that passively
observes community servers it has joined. When commanded via Telegram, it
collects publicly visible information about a target Discord user — mutual
servers, roles, message activity surfaced by Discord's own search endpoint,
voice state, profile connections — and produces a report.

## What this software is **not** for

- Surveillance of users outside a community **you yourself moderate**.
- Doxxing, harassment, or coordinated targeting of any individual.
- Building reputation databases shared with third parties.
- Commercial OSINT services.
- Any use Discord, your local data-protection authority, or basic ethics
  would consider abusive.

## Legal & ToS risk

### Discord Terms of Service

Operating a self-bot violates [Discord's Terms of Service][tos]. Discord
*will* detect and terminate the account if you scale this carelessly. The
project ships with mitigations (rate limits, residential-IP guidance,
no-active-action policy), but **bans are an operational certainty over a
long enough timeline.** Use a throwaway account.

### Data protection

In the EU, Türkiye, UK, California, and many other jurisdictions, processing
identifiable information about a person — even publicly available
information — can trigger obligations under GDPR, KVKK, CCPA, or similar
regimes. You may become a data **processor** the moment you run `/lookup`
against a person who is not you.

What this means in practice:

- You need a **lawful basis** for the processing. "Legitimate moderation
  interest in my own community" is defensible; "interesting profile"
  is not.
- You must not **share, sell, or retain** reports beyond their immediate
  moderation use.
- If a data subject formally asks what you hold on them, you must respond
  truthfully — echidna's zero-persistence design helps here, because the
  honest answer is usually "nothing, the report was deleted after delivery."

### Anti-stalking / cyber-harassment statutes

Many jurisdictions criminalize repeated tracking of an individual across
platforms. Using echidna to monitor an ex-partner, a perceived rival, or
any specific person without a moderation justification is a likely criminal
offense in your country. Don't do it.

## Liability

The software is provided **"as is"**. The authors and contributors
**disclaim all liability** for:

- account termination on Discord or any other platform,
- civil suits or regulatory action against the operator,
- harm caused to a third party by misuse of the reports,
- any other damage, direct or indirect, arising from the use of this code.

Forking, modifying, or redistributing the software does not transfer
liability to upstream contributors.

## Acceptable-use checklist

Before running `/lookup` on someone, ask yourself:

- [ ] Is the target a candidate for membership in a Discord community I
      personally administer?
- [ ] Do I have a defensible moderation reason (raid suspicion, scam
      report, voice-verification follow-up)?
- [ ] Will I delete the resulting report after I act on it?
- [ ] Will I refrain from sharing the report with anyone outside my
      moderation team?
- [ ] Am I prepared to honor a data-subject access request if the user
      asks?

If you cannot answer "yes" to all five, do not run the lookup.

[tos]: https://discord.com/terms
