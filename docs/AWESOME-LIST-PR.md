# Awesome-list PR pack

Copy-paste each section into the appropriate awesome list. Open one PR per list. Keep descriptions under 200 chars where the list enforces it.

---

## awesome-ai-agents

**Target:** `https://github.com/e2b-dev/awesome-ai-agents` (or current canonical fork)

**File:** `README.md` — add under **Tools & Frameworks** or **Developer Tools**

**Entry:**

```markdown
- [claims-ledger](https://github.com/isatimur/claims-ledger) — Source-anchored claims for agent decisions and docs. Every strong claim carries a verbatim quote anchor; CI fails (exit 11) when pointers go stale. MCP server + GitHub Action.
```

**PR title:** `Add claims-ledger — source-anchored claims with CI gate for agents`

**PR body:**

```markdown
## Summary

Adds [claims-ledger](https://github.com/isatimur/claims-ledger) — a CLI + GitHub Action that makes AI coding agents (and humans) anchor every claim to a verifiable source.

## Why this list

- `edt mcp serve` exposes `ledger_search`, `trace_add_decision`, `anchor_verify` for agent harnesses
- Fabricated quotes rejected at add time — anti-hallucination by construction
- PR-body trace format verified server-side by the Action
- Born from a 794-video practitioner corpus ([evidence graph](https://fromcopilottocolleague.com/read/graph))

## Checklist

- [x] Link is to the official repo
- [x] Description is accurate and concise
- [x] Tool is actively maintained (v1.0.0, Jul 2026)
```

---

## awesome-devops

**Target:** `https://github.com/awesome-devops/awesome-devops` (or `https://github.com/WolfgangFahl/awesome-devops`)

**File:** `README.md` — add under **CI/CD** or **Documentation**

**Entry:**

```markdown
- [claims-ledger](https://github.com/isatimur/claims-ledger) — Documentation CI that fails when claim anchors go stale. Verbatim quote resolution across git/doc/ADR/GitHub/YouTube anchors. GitHub Action: `uses: isatimur/claims-ledger@v1`.
```

**PR title:** `Add claims-ledger — doc-rot CI gate with quote-verified anchors`

**PR body:**

```markdown
## Summary

Adds claims-ledger — treats documentation claims like code: every strong claim has machine-verifiable anchors, and CI exits 11 when they drift.

## Why this list

- GitHub Action gates PRs on anchor freshness
- Six anchor schemes: git://, doc://, adr://, gh://, yt://, ts://
- Self-hosting: repo gates its own README claims
- Sandbox template for zero-install try: https://github.com/isatimur/claims-ledger-sandbox

## Checklist

- [x] Fits CI/CD or documentation tooling category
- [x] Open source, MIT
```

---

## awesome-github-actions

**Target:** `https://github.com/sdras/awesome-actions`

**File:** `README.md` — add under **Code Quality** or **Static Analysis** (nearest fit: documentation integrity)

**Entry:**

```markdown
- [Auto-Ledger & Verify](https://github.com/isatimur/claims-ledger) - Fail CI when documentation claims go stale. Parses `.ledger/claims.md`, re-resolves verbatim quote anchors, annotates PRs. Marketplace mirror: [`isatimur/auto-ledger-verify`](https://github.com/isatimur/auto-ledger-verify).
```

**PR title:** `Add claims-ledger Action — verify doc claim anchors on every PR`

**PR body:**

```markdown
## Summary

Adds the claims-ledger GitHub Action — verifies source-anchored claims in `.ledger/claims.md` on every PR/push.

## Usage

\`\`\`yaml
- uses: isatimur/claims-ledger@v1
\`\`\`

## Features

- Verify mode: re-resolves anchors, exit 11 on stale
- Extract mode: mines proposed claims from PR diffs (requires OPENROUTER_API_KEY)
- Check run + PR annotation
- v1.0.0 tagged, documented at https://github.com/isatimur/claims-ledger

## Checklist

- [x] Action is published and usable
- [x] Link points to action source / marketplace listing
```

---

## Submission order

1. **awesome-github-actions** — highest intent match, Action users convert fastest
2. **awesome-ai-agents** — agent/MCP audience
3. **awesome-devops** — doc-CI angle

Submit after HN launch (T+2..7), not before — avoid looking like astroturf.
