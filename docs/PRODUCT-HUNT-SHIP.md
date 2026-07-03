# Product Hunt Ship — draft for Wed Jul 8

**Schedule:** Wednesday Jul 8, 2026 · 06:00 PT (T+1 after Show HN Tue Jul 7)  
**Do not post same day as HN.** User posts manually — agent does not submit.

Full baseline: [`PRODUCT-HUNT.md`](PRODUCT-HUNT.md)

---

## Ship page fields

### Name

```
claims-ledger
```

### Tagline (60 chars max)

```
CI fails when your docs' claims go stale — anchored to source
```

(59 chars)

### Description (first 260 chars — above the fold)

```
Every strong claim in your docs carries a machine-verifiable pointer — git line, ADR, YouTube timestamp. When the source moves, CI fails (exit 11).

GitHub Action + CLI. Verbatim quote resolution. Born from a 794-video practitioner corpus.
```

### Full description

Every claim in your docs, PRs, and agent decisions carries a machine-verifiable pointer to its source — a git line, an ADR, a YouTube timestamp. When the source moves, CI fails.

**Auto-Ledger & Verify** is a GitHub Action + CLI that:

- Parses `.ledger/claims.md` (markdown = source of truth)
- Re-resolves every anchor quote (exact → fuzzy 0.87)
- Fails the build on stale anchors (exit 11)
- Annotates PRs with an Evidence Decision Trace
- Exposes MCP tools for agent harnesses (`ledger_search`, `anchor_verify`)

We built this after anchoring 54 claims across a 794-video practitioner corpus for [*From Copilot to Colleague*](https://fromcopilottocolleague.com/read/graph). Same grammar, now for codebases.

**Try in 30 seconds:** fork [claims-ledger-sandbox](https://github.com/isatimur/claims-ledger-sandbox)

---

## Gallery images (upload order)

| # | Asset | Path / URL |
|---|-------|------------|
| 1 | 60s demo loop | `demo/demo.gif` — https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif |
| 2 | Social preview | `docs/social-preview.png` |
| 3 | Event ledger page | Screenshot of https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025 |
| 4 | README badge (green) | Screenshot of shields badge on claims-ledger README |
| 5 | PR check annotation | Screenshot of GitHub check run (optional) |

**Thumbnail:** use `docs/social-preview.png` or frame 1 of demo GIF.

---

## Topics

Developer Tools · Open Source · GitHub · AI · Documentation

---

## Links

| Field | URL |
|-------|-----|
| Website | https://fromcopilottocolleague.com/ledgers |
| GitHub | https://github.com/isatimur/claims-ledger |
| Demo / sandbox | https://github.com/isatimur/claims-ledger-sandbox |

---

## First comment (maker) — paste at launch

Hi PH — Timur here.

Quick demo of what happens when a doc claim goes stale:

1. `.ledger/claims.md` says "API timeout is 30s" anchored to `config.ts`
2. Someone changes the constant without updating the ledger
3. GitHub Action exits 11, check goes red
4. `edt reanchor claims#1` follows the quote to its new home

The anti-fabrication trick: every anchor carries a **verbatim quote**. LLMs can hallucinate justifications; they cannot hallucinate a string into a commit.

Links:
- Repo: https://github.com/isatimur/claims-ledger
- Event ledger (Joel Hron, Thomson Reuters): https://fromcopilottocolleague.com/ledgers/joel-hron-trustworthy-agents-2025
- Sandbox: https://github.com/isatimur/claims-ledger-sandbox
- 60s GIF: https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif

Happy to answer questions on anchor schemes, exit codes, or the MCP server.

---

## Launch checklist (Wed Jul 8)

- [ ] HN thread from Tue Jul 7 still open — link PH in a reply, not a new top-level HN post
- [ ] Gallery: demo.gif + social-preview.png uploaded
- [ ] Tagline + description pasted from this doc
- [ ] Maker comment ready in clipboard
- [ ] 2–3 friendly devs notified privately for first-hour upvotes (no public coordination)
- [ ] Monitor GitHub stars + sandbox forks during PH day
- [ ] Do **not** cross-post identical text to X/Reddit same hour — stagger per runbook

---

## Hunter

Optional: ask one friendly dev with PH history to hunt. Maker account (Timur) can self-ship if no hunter.
