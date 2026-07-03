# Show HN — copy-paste ready

**Post Tuesday 07:30 PT.** First comment within 60 seconds of the post.

---

## Title (use #1 from blueprint)

```
Show HN: A GitHub Action that fails CI when your docs' claims go stale
```

Alternate titles if #1 stalls:
- `Show HN: Make AI coding agents cite their sources — every decision anchored to a commit or ADR`
- `Show HN: We fact-checked an OpenAI harness talk, anchored to the second (open-source pipeline)`

---

## URL

```
https://github.com/isatimur/claims-ledger
```

---

## First comment (maker walkthrough)

Hi HN — Timur here. We built this after anchoring every claim in a book to a 794-video practitioner corpus ([evidence graph](https://fromcopilottocolleague.com/read/graph)). Same discipline, now for codebases.

**The problem:** docs rot silently. Someone writes "auth tokens rotate every 24h", a refactor moves `rotate.ts`, and the sentence becomes fiction. LLMs make this worse — they confidently cite things that moved.

**The mechanism:**

1. Claims live in `.ledger/claims.md` (markdown = source of truth).
2. Every claim has anchors — six schemes: `git://`, `doc://`, `adr://`, `gh://`, `yt://`, `ts://`.
3. Every anchor carries a **verbatim quote**. The quote either resolves at the ref or it doesn't. An LLM can hallucinate a justification; it cannot hallucinate a string into a commit.
4. `edt verify --gate` re-resolves every quote (exact → fuzzy at 0.87). Stale ⇒ exit **11**, CI red.
5. `edt reanchor claims#N` follows the quote to its new home.

**Try in 60 seconds:**

```bash
git clone https://github.com/isatimur/claims-ledger
cd claims-ledger && npm install && npm run build
./demo/scenario.sh
```

You'll see: verify passes → break the anchor → exit 11 → reanchor → passes again.

**GitHub Action** — drop into any repo:

```yaml
- uses: isatimur/claims-ledger@v1
```

Verify mode gates stale anchors. Extract mode (with `OPENROUTER_API_KEY`) mines claims from PR diffs into `.ledger/claims.proposed.md` — proposals only, never auto-merged.

**For agents:** `edt trace new` → `add-decision` with `--anchor` + `--quote` pairs. Fabricated quotes are **rejected at add time**. Render with `edt render --format pr-body` — the Action verifies the fenced block server-side.

**Exit codes (API, won't change casually):**
- `0` all fresh
- `10` tentative/unanchored strong claim
- `11` stale anchor ← the one you'll hit after a refactor
- `12` judge panel spread >20 (human look)
- `13` required trace missing

**Flagship dataset:** 54 claims, 199 anchors, 794 videos — [browse the graph](https://fromcopilottocolleague.com/read/graph). Same parser, byte-compatible with the book's grammar.

**Event ledger sample:** [OpenAI Harness Engineering talk](https://github.com/isatimur/claims-ledger/tree/main/examples/ledgers/openai-harness-engineering-2025) — 5 claims anchored to the second (sample from the book corpus, honestly labeled).

**MCP:** `edt mcp serve` exposes `ledger_search`, `trace_add_decision`, `anchor_verify`, etc. for agent harnesses.

Happy to answer questions on the resolver cascade, the judge panel (3 rival models, median wins, spread>20 flags), or the anti-fabrication design. Code is MIT, self-hosting from day one — this repo gates its own README claims.

---

## Links to include in follow-up comments

| Asset | URL |
|-------|-----|
| Repo | https://github.com/isatimur/claims-ledger |
| Demo script | https://github.com/isatimur/claims-ledger/blob/main/demo/scenario.sh |
| Evidence graph (794 videos) | https://fromcopilottocolleague.com/read/graph |
| Event ledger sample | https://github.com/isatimur/claims-ledger/tree/main/examples/ledgers/openai-harness-engineering-2025 |
| Action marketplace workflow | https://github.com/isatimur/claims-ledger/blob/main/examples/ledger.yml |
| Sandbox template | https://github.com/isatimur/claims-ledger/tree/main/examples/sandbox |

---

## Posting checklist

- [ ] Record 60s GIF (`demo/RECORDING.md`) and add to README before posting
- [ ] Confirm CI green: `gh run list --repo isatimur/claims-ledger --limit 3`
- [ ] Block 48h for comment responses
- [ ] Product Hunt **T+1** (never same day as HN)
