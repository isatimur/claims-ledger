# Seeded good-first-issues

To be filed as GitHub issues at launch (blueprint §3.2 readiness item). Each is scoped,
self-contained, and has a named owner-file to start from.

| # | Title | Area | Difficulty | Notes |
|---|---|---|---|---|
| 1 | VTT/SRT transcript adapter → `ts://` anchors | ledger-core | easy | ~150 LoC; parse WebVTT cue timestamps, expose `SourceDocument`; grammar already in `anchors.ts` |
| 2 | Whisper/Deepgram JSON adapter (word-snapped `ts://` anchors) | ledger-core | medium | snap quote boundaries to word timestamps |
| 3 | `edt verify --only-touched` should use `git diff --name-only <base>` in CI, not `git status` | edt | easy | today's implementation covers the pre-commit-hook case only |
| 4 | Follow renames via `git log --follow` in `edt reanchor` | edt | medium | current cascade greps `git ls-files`; renames with content drift need history |
| 5 | Sticky PR comment (marker `<!-- claims-ledger-report -->`, update-in-place) | action | easy | payload exists in `run.ts`; add the issues-API call |
| 6 | `edt mcp serve` — expose `ledger_search` / `trace_add_decision` / `anchor_verify` over MCP | edt | hard | the anti-fabrication check is already in `cmdTraceAddDecision` |
| 7 | Badge worker: Cloudflare Worker reading committed `ledger.json` via raw.githubusercontent, 1h cache | new pkg | medium | ~100 LoC; no DB — the ledger file *is* the API |
| 8 | OpenRouter judge panel: wire `OpenRouterJudgePanel` into the Action's extract mode | action | medium | interface + merge logic done; needs prompt iteration + retry/backoff |
| 9 | `gh://` anchor verification through the GitHub API in Action context | action | easy | offline it's `unverifiable`; in CI we have a token |
| 10 | Embedding stage for the resolver cascade (sqlite-vec local index) | ledger-core | hard | third stage after exact→fuzzy; `.ledger/index.db`, committable to CI cache |
