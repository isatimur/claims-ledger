# Launch plan — condensed from the Claims-Ledger blueprint §3

## Three Show HN titles

1. **Show HN: A GitHub Action that fails CI when your docs' claims go stale** ← safest lead: concrete, immediately testable, pain-first
2. **Show HN: We fact-checked the OpenAI DevDay keynote, anchored to the second (open-source pipeline)** ← high-variance event-ledger play; run only the same week as the event
3. **Show HN: Make AI coding agents cite their sources — every decision anchored to a commit or ADR** ← targets the agentic-AI current; strongest if the Claude Code skill ships day one

## Sequencing checklist (T = HN launch day, a Tuesday)

**Repo readiness (before any post):**
- [x] `edt init && edt verify` passes on this repo itself — README claims live in `.ledger/claims.md` with anchors (self-hosting is the credibility move)
- [x] 60-second demo script at `demo/scenario.sh` (GIF: record per `demo/RECORDING.md`)
- [x] Event ledger sample at `examples/ledgers/openai-harness-engineering-2025/`
- [x] Sandbox template at `examples/sandbox/`
- [x] Show HN draft at `docs/SHOW-HN.md`
- [x] Marketplace guide at `docs/MARKETPLACE.md`
- [ ] Marketplace listing live with `examples/ledger.yml` as copy-paste (Submit button — manual)
- [x] `CONTRIBUTING.md` + good-first-issues seeded (HN traffic converts to contributors in the first 48h or never)
- [x] Action mirror repo `isatimur/auto-ledger-verify` (Marketplace slug)
- [x] Public sandbox `isatimur/claims-ledger-sandbox` (fork-me demo)
- [x] Event ledger #2 — Sean Grove "The New Code" ([live](https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025))
- [x] Event ledger #3 — Eric Zakariasson "Software Factory" ([live](https://fromcopilottocolleague.com/ledgers/cursor-software-factory-2025))
- [x] Launch amplification drafts — `docs/PRODUCT-HUNT.md`, `docs/X-THREAD.md`, `docs/REDDIT-r-programming.md`
- [x] Badge on book lab README (shields endpoint from `edt verify`)
- [ ] Badge on 3–5 friendly repos (`img.claims-ledger.dev` — Cloudflare Worker, Phase 2)

**Timeline:**
- **T−14** — badge + Action quietly live; friendly repos onboarded; event ledger #1 published, shared only on X; collect reaction quotes
- **T−7** — event ledger #2 published ([Sean Grove — The New Code](https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025)); blog post drafted: *"We anchored every claim in a 794-video corpus. Then we pointed the machine at our own codebase."*
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

**Shipped today (zero infra):** `edt verify` writes `.ledger/badge.json` in the
[shields endpoint schema](https://shields.io/badges/endpoint-badge). Commit it, then:

```markdown
[![Claims verified](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FOWNER%2FREPO%2Fmain%2F.ledger%2Fbadge.json)](.ledger/claims.md)
```

Renders `claims | N anchored · F/T fresh` — red when anything is stale, orange when the ledger
is only verifiable online (transcript anchors offline), never green-washed.

**Phase 2 (hosted):** a ~100-LoC Cloudflare Worker at `img.claims-ledger.dev/badge/OWNER/REPO`
reads each repo's committed `.ledger/ledger.json` via raw.githubusercontent (cached 1h, no DB —
the ledger file *is* the API) and serves the same message format, so READMEs migrate by swapping
the URL:

```markdown
[![Claims verified](https://img.claims-ledger.dev/badge/OWNER/REPO)](https://claims-ledger.dev/r/OWNER/REPO)
```

Free, flattering (proves your docs are maintained), and every impression is an ad to exactly the
audience that cares.
