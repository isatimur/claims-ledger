# Launch plan — condensed from the Claims-Ledger blueprint §3

## Three Show HN titles

1. **Show HN: A GitHub Action that fails CI when your docs' claims go stale** ← safest lead: concrete, immediately testable, pain-first
2. **Show HN: We fact-checked the OpenAI DevDay keynote, anchored to the second (open-source pipeline)** ← high-variance event-ledger play; run only the same week as the event
3. **Show HN: Make AI coding agents cite their sources — every decision anchored to a commit or ADR** ← targets the agentic-AI current; strongest if the Claude Code skill ships day one

## Sequencing checklist (T = HN launch day, a Tuesday)

**Repo readiness (before any post):**
- [x] `edt init && edt verify` passes on this repo itself — README claims live in `.ledger/claims.md` with anchors (self-hosting is the credibility move)
- [ ] 60-second GIF at top of README: PR opened → check fails on stale anchor → `edt reanchor` → check green (record against a real refactor, not a toy)
- [x] README quickstart ≤ 5 lines to first value
- [ ] Two live event ledgers published on fromcopilottocolleague.com (HN post must link to a *thing*, not a promise)
- [ ] Marketplace listing live with `examples/ledger.yml` as copy-paste
- [x] `CONTRIBUTING.md` + good-first-issues seeded (HN traffic converts to contributors in the first 48h or never)
- [ ] Badge on 3–5 friendly repos (`img.claims-ledger.dev` — Cloudflare Worker, Phase 2)

**Timeline:**
- **T−14** — badge + Action quietly live; friendly repos onboarded; event ledger #1 published, shared only on X; collect reaction quotes
- **T−7** — event ledger #2 (timed to an actual event that week); blog post drafted: *"We anchored every claim in a 794-video corpus. Then we pointed the machine at our own codebase."*
- **T, 07:30 PT** — Show HN (title #1); first comment is the maker's technical walkthrough: schema, the anti-fabrication quote-resolution trick, the exit codes. HN respects mechanism over vision.
- **T+1** — Product Hunt (never same day as HN); assets: the GIF, the event ledger, the badge
- **T+2..7** — X thread on the event ledger's spiciest finding ("3 keynote claims graded *tentative* — here's the exact second each was made"); dev.to/newsletter follow-ups; respond to every HN comment with code links

## PR-body block example

The integration surface for agents that can't run binaries — the Action parses and verifies this
server-side (`edt render --format pr-body` emits it):

````markdown
```edt-trace v1
trace: edt-2026-07-02-481
- edt#1 [strong] refactor: Moved JWT verification into gateway/auth/
  ⚓ doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0 "crypto-touching code lives under gateway/auth/ exclusively"
  ⚓ git://c3d9a72/gateway/verify.ts#L1-L8 "// TODO(priya): this file should not import node:crypto directly"
- edt#2 [moderate] dependency: Replaced jsonwebtoken with jose (ESM, maintained)
  ⚓ gh://issues/442#comment-19883 "jsonwebtoken is CJS-only and blocks the ESM migration"
```
````

## The badge — the viral loop

```markdown
[![Claims verified](https://img.claims-ledger.dev/badge/OWNER/REPO)](https://claims-ledger.dev/r/OWNER/REPO)
```

Renders `claims 54 anchored · 198/199 fresh` per-repo, links to the hosted ledger. Free,
flattering (proves your docs are maintained), and every impression is an ad to exactly the
audience that cares.
