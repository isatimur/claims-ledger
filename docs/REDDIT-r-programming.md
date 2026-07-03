# Reddit r/programming — optional draft (T+3..7)

Lower priority than HN/PH/X. Post only if HN thread is healthy (50+ upvotes, active discussion).

---

## Title options

1. `I built a GitHub Action that fails CI when documentation claims go stale (source-anchored quotes)`
2. `Every doc claim carries a verifiable pointer to its source — CI fails when it rots`

## Body

I've been working on source-anchored claims for a book project — 54 claims, 199 anchors, each pointing to the exact second of a practitioner talk in a 794-video corpus ([evidence graph](https://fromcopilottocolleague.com/read/graph)).

I extracted the same discipline into a tool for codebases: **claims-ledger**.

**The problem:** docs rot silently. Someone writes "auth tokens rotate every 24h", a refactor moves the file, and the sentence becomes fiction. LLMs make this worse.

**The approach:**

- Claims live in `.ledger/claims.md` (markdown = source of truth)
- Every claim has anchors: `git://`, `doc://`, `adr://`, `gh://`, `yt://`, `ts://`
- Every anchor carries a **verbatim quote** — resolves at the ref or it doesn't
- `edt verify --gate` re-checks every quote; stale ⇒ exit 11

There's a GitHub Action (`isatimur/claims-ledger@v1`) that runs on every PR. A sandbox repo you can fork in 30 seconds: https://github.com/isatimur/claims-ledger-sandbox

Open source (MIT): https://github.com/isatimur/claims-ledger

Happy to answer questions about the anchor resolution cascade or the judge panel for claim scoring.

## Posting notes

- Don't post a link-only submission — the body above is the value
- Respond to every comment for 4 hours
- Cross-link event ledger if someone asks about fact-checking talks
