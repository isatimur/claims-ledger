# Dev.to article — draft (do not publish until user posts)

**Title:** We anchored 54 claims to 794 videos, then built CI that fails when docs lie

**Tags:** `opensource`, `githubactions`, `ai`, `documentation`

**Canonical URL (after publish):** link to `https://github.com/isatimur/claims-ledger`

**Timing note:** Hold until after HN launch (Jul 7, 07:30 PT). Post as a follow-up 2–3 days later, not same day as Show HN or Product Hunt.

---

## Cover image

Use the demo GIF: `https://raw.githubusercontent.com/isatimur/claims-ledger/main/demo/demo.gif`

---

## Article body (copy-paste into Dev.to editor)

We spent a year building an online book from a 794-video practitioner corpus — [From Copilot to Colleague](https://fromcopilottocolleague.com). Every chapter claim links to the exact second of the talk that supports it. Browse the [evidence graph](https://fromcopilottocolleague.com/read/graph): 54 claims, 199 anchors, one grammar.

Then we pointed the same machine at our own codebase.

The result is **claims-ledger** — open source, MIT, self-hosting from day one. Docs rot silently; agents make it worse. This repo makes stale documentation a CI failure.

### The problem nobody talks about

Someone writes *"auth tokens rotate every 24h."* A refactor moves `rotate.ts`. The sentence becomes fiction. LLMs confidently cite things that moved three sprints ago.

Traditional doc linting catches broken links. It does not catch **semantic drift** — the claim is still grammatically valid, but the code no longer supports it.

### The mechanism: verbatim quotes, not vibes

Claims live in `.ledger/claims.md`. Every strong claim has anchors using six schemes:

```
git://   doc://   adr://   gh://   yt://   ts://
```

Every anchor carries a **verbatim quote**. The quote either resolves at the ref or it doesn't. An LLM can hallucinate a justification; it cannot hallucinate a string into a commit.

Example from our own README ledger:

```markdown
## 1) edt verify exits 11 when an anchor goes stale
- **Support level:** strong
- **Source:** packages/edt/src/commands.ts
  - **Anchor:** `git://abc123/packages/edt/src/commands.ts#L42-L48` · confidence: high
    - **Quote:** "process.exit(11)"
```

When someone refactors that file, `edt verify --gate` re-resolves every quote (exact match → fuzzy at 0.87). Stale ⇒ **exit 11**, CI red. `edt reanchor claims#N` follows the quote to its new home.

### Try it in 60 seconds

```bash
git clone https://github.com/isatimur/claims-ledger
cd claims-ledger && npm install && npm run build
./demo/scenario.sh
```

You'll see: verify passes → break the anchor → exit 11 → reanchor → passes again.

![60-second demo](https://raw.githubusercontent.com/isatimur/claims-ledger/main/demo/demo.gif)

Or fork the sandbox — no local install:

**[github.com/isatimur/claims-ledger-sandbox](https://github.com/isatimur/claims-ledger-sandbox)**

### Gate every PR with one YAML line

```yaml
# .github/workflows/ledger.yml
name: claims-ledger
on: [pull_request, push]
jobs:
  ledger:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: isatimur/claims-ledger@v1
```

Verify mode gates stale anchors. Extract mode (with `OPENROUTER_API_KEY`) mines claims from PR diffs into `.ledger/claims.proposed.md` — proposals only, never auto-merged.

### From book corpus to event ledgers

The book's claim grammar is byte-compatible with the CLI parser. We published three **event ledgers** — standalone claim sets anchored to single talks:

| Talk | Live ledger |
|------|-------------|
| Ryan Lopopolo — Harness Engineering | [fromcopilottocolleague.com/ledgers/openai-harness-engineering-2025](https://fromcopilottocolleague.com/ledgers/openai-harness-engineering-2025) |
| Sean Grove — The New Code | [fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025](https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025) |
| Eric Zakariasson — Software Factory | [fromcopilottocolleague.com/ledgers/cursor-software-factory-2025](https://fromcopilottocolleague.com/ledgers/cursor-software-factory-2025) |

Each claim clicks to the exact timestamp in the YouTube talk. Same resolver, same honest labeling.

Generate your own:

```bash
node scripts/event-ledger.mjs <video_id> "<title>" --out examples/ledgers/<slug>
```

### Exit codes (stable API)

| Code | Meaning |
|------|---------|
| `0` | All anchors fresh |
| `10` | Tentative/unanchored strong claim |
| `11` | Stale anchor ← the one you hit after a refactor |
| `12` | Judge panel spread >20 (human look) |
| `13` | Required trace missing |

### For agents: MCP + PR traces

```bash
edt mcp serve   # ledger_search, trace_add_decision, anchor_verify, …
edt trace new
edt add-decision --anchor git://... --quote "verbatim string"
edt render --format pr-body
```

Fabricated quotes are **rejected at add time**. The GitHub Action verifies the fenced `edt-trace v1` block server-side.

### The badge loop

`edt verify` writes `.ledger/badge.json` in the shields endpoint schema. Commit it:

```markdown
[![Claims verified](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FOWNER%2FREPO%2Fmain%2F.ledger%2Fbadge.json)](.ledger/claims.md)
```

Renders `claims | N anchored · F/T fresh` — red when anything is stale. Zero infrastructure.

### What we learned building this

1. **Quotes beat citations.** A link to a file is not evidence. A verbatim substring at a ref is.
2. **Markdown is the source of truth.** `ledger.json` is a build artifact. Humans and agents edit the same file.
3. **Honest labeling matters.** Our event ledgers are corpus samples, not live-extracted at publish time. Trust compounds.
4. **Self-hosting is the credibility move.** This repo gates its own README claims.

### Links

- Repo: [github.com/isatimur/claims-ledger](https://github.com/isatimur/claims-ledger)
- Sandbox: [github.com/isatimur/claims-ledger-sandbox](https://github.com/isatimur/claims-ledger-sandbox)
- Book evidence graph: [fromcopilottocolleague.com/read/graph](https://fromcopilottocolleague.com/read/graph)
- Event ledgers index: [fromcopilottocolleague.com/ledgers](https://fromcopilottocolleague.com/ledgers)
- npm (when published): `npx @claims-ledger/edt init`

Questions welcome in the repo issues. MIT license.

---

## Dev.to series note

If this performs, follow-ups:

1. "The anti-fabrication trick: why verbatim quotes beat RAG citations"
2. "Event ledgers: fact-checking keynotes to the second"
3. "Exit code 11: making doc rot a CI failure"

Do not schedule until HN + PH window closes.
