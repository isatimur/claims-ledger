# Product Hunt — T+1 after HN (Wednesday)

**Do not post same day as HN.** Schedule for Wednesday morning PT after Tuesday HN launch.

---

## Tagline (60 chars max)

```
CI fails when your docs' claims go stale — anchored to source
```

## Description

Every claim in your docs, PRs, and agent decisions carries a machine-verifiable pointer to its source — a git line, an ADR, a YouTube timestamp. When the source moves, CI fails.

**Auto-Ledger & Verify** is a GitHub Action + CLI that:

- Parses `.ledger/claims.md` (markdown = source of truth)
- Re-resolves every anchor quote (exact → fuzzy 0.87)
- Fails the build on stale anchors (exit 11)
- Annotates PRs with an Evidence Decision Trace

We built this after anchoring 54 claims across a 794-video practitioner corpus for [*From Copilot to Colleague*](https://fromcopilottocolleague.com/read/graph). Same grammar, now for codebases.

**Try in 30 seconds:** fork [claims-ledger-sandbox](https://github.com/isatimur/claims-ledger-sandbox)

## First comment (maker)

Hi PH — Timur here. Quick demo of what happens when a doc claim goes stale:

1. `.ledger/claims.md` says "API timeout is 30s" anchored to `config.ts`
2. Someone changes the constant without updating the ledger
3. GitHub Action exits 11, check goes red
4. `edt reanchor claims#1` follows the quote to its new home

The anti-fabrication trick: every anchor carries a **verbatim quote**. LLMs can hallucinate justifications; they cannot hallucinate a string into a commit.

Links:
- Repo: https://github.com/isatimur/claims-ledger
- Event ledger (Sean Grove, OpenAI): https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025
- Sandbox: https://github.com/isatimur/claims-ledger-sandbox

## Gallery assets

1. `demo/demo.gif` — 60-second verify → break → reanchor loop
2. Screenshot of event ledger page on book site
3. Screenshot of PR check annotation

## Topics

Developer Tools, Open Source, GitHub, AI, Documentation

## Schedule

- **When:** Wednesday 00:01 PT (or 06:00 PT for US audience)
- **Who posts:** Timur (maker account)
- **Hunter:** ask 2–3 friendly devs to upvote in first hour (don't coordinate publicly)
