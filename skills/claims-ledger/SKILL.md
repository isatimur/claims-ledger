---
name: claims-ledger
description: >-
  Use when an AI coding agent modifies a repo and should anchor every decision
  to verifiable evidence — commits, ADRs, doc sections, or transcript timestamps.
  Trigger on PR prep, doc changes, refactors, or when the user asks for evidence
  traces, claim anchoring, or stale-doc detection. Requires edt trace on agent
  stop when the diff is non-empty. Integrates with claims-ledger CLI and MCP.
---

# Claims Ledger — agent evidence discipline

Make agents cite sources the way the book corpus does: **no anchor, no strong claim.**

## When to use

- Before finishing a PR that changes behavior docs depend on
- After refactors that might stale `.ledger/claims.md` anchors
- When the user wants CI to fail on stale documentation claims
- When wiring an agent harness to require Evidence Decision Traces

## Hard rules

1. **Every decision in the trace needs anchor + verbatim quote.** Quotes must resolve at the ref — `edt trace add-decision` rejects fabrications.
2. **Never upgrade unverifiable to strong.** Offline `yt://` anchors report honestly; tentative stays tentative.
3. **On agent stop with a non-empty diff:** an EDT trace must exist or be explicitly waived by the user.

## Workflow

### 1. Init (once per repo)

```bash
npx @claims-ledger/edt init
```

### 2. Open a trace for the current PR

```bash
edt trace new --pr $(gh pr view --json number -q .number 2>/dev/null || echo 0)
```

### 3. Record each non-trivial decision

```bash
edt trace add-decision \
  --text "Moved JWT verification into gateway/auth/ to isolate crypto deps" \
  --kind refactor \
  --anchor "doc://docs/adr/0007-auth-module-boundaries.md#decision@$(git rev-parse --short HEAD)" \
  --quote "crypto-touching code lives under gateway/auth/ exclusively" \
  --confidence high
```

If quote resolution fails → fix the quote or the ref; do not `--force` unless the user explicitly allows it.

### 4. Score (optional, needs OPENROUTER_API_KEY)

```bash
edt trace score
```

Spread >20 flags the decision (exit 12) — surface to the user.

### 5. Render for the PR body

```bash
edt render --format pr-body
```

Paste the fenced `edt-trace v1` block into the PR description.

### 6. Verify before stop

```bash
edt verify --gate --require-trace
```

Exit codes: `0` ok · `11` stale anchor · `12` panel spread · `13` trace missing.

### 7. Fix stale anchors after refactors

```bash
edt reanchor claims#N
edt verify --gate
```

## MCP (optional)

```bash
edt mcp serve
```

Tools: `ledger_search`, `trace_add_decision`, `trace_score`, `anchor_verify`, `ledger_claims`.

## Hook — require trace on agent stop

Add to `.cursor/hooks.json` (project) or `~/.cursor/hooks.json` (user):

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": ".cursor/hooks/require-edt-trace.sh",
        "loop_limit": 1
      }
    ]
  }
}
```

Create `.cursor/hooks/require-edt-trace.sh`:

```bash
#!/usr/bin/env bash
# Require an edt trace when the agent leaves a non-empty git diff.
set -euo pipefail
INPUT=$(cat)
# Skip if not a git repo or no changes
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi
# Trace must exist for current branch
ROOT=$(git rev-parse --show-toplevel)
TRACE_DIR="$ROOT/.ledger/traces"
if [ ! -d "$TRACE_DIR" ] || [ -z "$(find "$TRACE_DIR" -name '*.trace.json' -newer "$ROOT/.git/HEAD" 2>/dev/null)" ]; then
  if ! command -v edt >/dev/null 2>&1 && [ ! -f "$ROOT/node_modules/.bin/edt" ]; then
    echo '{"followup_message":"Diff is non-empty but edt is not installed. Run: npx @claims-ledger/edt init && edt trace new"}' 
    exit 0
  fi
  EDT="${EDT:-edt}"
  if ! $EDT verify --require-trace --gate 2>/dev/null; then
    echo '{"followup_message":"Non-empty diff requires an Evidence Decision Trace. Run: edt trace new && edt trace add-decision ... && edt render --format pr-body"}'
    exit 0
  fi
fi
exit 0
```

Make executable: `chmod +x .cursor/hooks/require-edt-trace.sh`

## References

- Repo: https://github.com/isatimur/claims-ledger
- Demo: `./demo/scenario.sh`
- Flagship dataset: https://fromcopilottocolleague.com/read/graph
