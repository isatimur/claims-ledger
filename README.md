# claims-ledger

> **Every claim in your docs, PRs, and agent decisions carries a machine-verifiable pointer to its source — a commit, a doc section, a transcript timestamp — and CI fails when the pointer goes stale.**

[![Claims verified](https://img.shields.io/badge/claims-anchored%20%C2%B7%20fresh-orange)](/.ledger/claims.md) <!-- badge service (img.claims-ledger.dev) lands in Phase 2 -->

## Quickstart

```bash
npx @claims-ledger/edt init      # scaffold .ledger/ + pre-commit hook
$EDITOR .ledger/claims.md        # write a claim, anchor it to a commit/doc/ADR
edt verify --gate                # exit 0: all anchors fresh · exit 11: something went stale
```

Or gate every PR without installing anything:

```yaml
- uses: isatimur/auto-ledger-verify@v1   # see examples/ledger.yml
```

## Why

Docs rot silently. An agent (or a colleague) writes *"auth tokens rotate every 24h"*, someone
refactors `rotate.ts`, and the sentence quietly becomes fiction. `claims-ledger` mechanizes the
discipline that shipped [fromcopilottocolleague.com](https://fromcopilottocolleague.com) — a book
whose **54 claims carry 199 anchors into a 794-video practitioner corpus**, every one clickable to
the exact second of the talk: **no anchor, no claim.** That corpus is the flagship public dataset
for this tool; the same grammar now points at codebases.

- A **claim** lives in `.ledger/claims.md` (markdown is the source of truth; `ledger.json` is the build artifact).
- An **anchor** is one of six schemes: `git://sha/path#L1-L2`, `doc://path#heading@sha`, `adr://id@sha`, `gh://issues/n#comment-id`, `yt://video_id ts → ts`, `ts://recording ts → ts`.
- Every anchor carries a **verbatim quote**. A quote either resolves at the ref or it doesn't — an LLM can hallucinate a justification, it cannot hallucinate a string into a commit.
- `edt verify` re-resolves every quote (exact → fuzzy, threshold 0.87). Below threshold ⇒ **stale**, CI goes red, `edt reanchor` follows the quote to its new home.

## Architecture

```
.ledger/claims.md  ──parse──►  ledger-core  ──verify──►  exit codes / check-run
     ▲                          │  parser (byte-compatible with the book's grammar)
     │ edt init/reanchor        │  6 anchor schemes · differ · resolver cascade
     │                          │  judge-panel median (3 rival models, spread>20 flags)
   edt CLI ◄────────────────────┘
     │
     └── trace-v1: agents attach a micro-ledger of anchored decisions to every PR
                   (edt trace new → add-decision → render --format pr-body)

packages/
  ledger-core   parser · anchors · differ · resolver · verifier · panel  (npm lib)
  edt           the CLI — init/trace/verify/reanchor/render/export       (npx-able)
  action        auto-ledger-verify GitHub Action (dist bundled, node20)
```

**Gate exit codes** (`edt verify --gate`): `0` all fresh · `10` tentative/unanchored ·
`11` stale anchor · `12` judge panel disagrees by >20 (human look) · `13` required trace missing ·
`2` internal error (never gates).

## For agents

An agent that modifies code attaches an **Evidence Decision Trace** to its PR — each decision
anchored to the ADR, commit, or meeting transcript that justifies it:

```bash
edt trace new --pr 481
edt trace add-decision \
  --text "Moved JWT verification into gateway/auth/ to isolate crypto deps" \
  --anchor "doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0" \
  --quote "crypto-touching code lives under gateway/auth/ exclusively" \
  --confidence high
edt render --format pr-body     # fenced block the Action verifies server-side
```

Anchors with quotes that don't resolve are **rejected at add time**. This repo eats its own dog
food: see [`.ledger/claims.md`](.ledger/claims.md) — the README claims above are anchored and
CI-gated.

## Flagship dataset

The first public `.ledger/` is the book's own Claims Ledger — the corpus that proved the
discipline before it was a tool. `ledger-core` parses it byte-compatibly and reproduces the
book's committed stats exactly:

```
$ edt verify        # against the book's Claims Ledger, offline
anchors: 0/199 fresh · 199 unverifiable (never gate)
· claims#1 yt://kDEvo2__Ijg 00:00:54.800 → 00:00:57.280
    no local transcripts dir (.ledger/transcripts); needs network
...
$ echo $?
0
```

**54 claims** (44 strong / 10 moderate) · **199 anchors** (198 high-confidence) · a
**794-video** practitioner corpus. Every `yt://` anchor is honestly reported as
*unverifiable offline* rather than assumed fresh — unverifiable never gates, only *stale*
does (flag, don't fabricate). Browse the dataset interactively at
[fromcopilottocolleague.com/read/graph](https://fromcopilottocolleague.com/read/graph),
where each of the 199 anchors is clickable to the exact second of the talk.

## Status

Phase 1 (CLI + core) and the Action's verify mode are real and tested. LLM claim extraction,
MCP server (`edt mcp serve`), the hosted viewer, and the badge service are on the
[roadmap](LAUNCH.md). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the
[good first issues](docs/good-first-issues.md).
