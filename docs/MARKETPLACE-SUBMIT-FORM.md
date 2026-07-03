# Marketplace submit form — copy-paste fields

Open https://github.com/marketplace/new → **Actions** → repository `isatimur/claims-ledger`.

No `gh marketplace` CLI exists (Jul 2026). Use this doc + screenshot checklist at bottom.

---

## Pre-flight (automated ✅ Jul 3)

| Check | Status |
|-------|--------|
| Root `action.yml` → `packages/action/dist/index.js` | ✅ |
| `packages/action/dist/index.js` built | ✅ (37 KB) |
| Tag `v1.0.0` + floating `v1` | ✅ |
| Branding `icon: anchor`, `color: orange` | ✅ |
| Demo GIF `demo/demo.gif` | ✅ |
| Social preview `docs/social-preview.png` | ✅ (upload manually) |
| Green CI on `main` | ✅ verify before Submit |

---

## Form fields

### Action repository

```
isatimur/claims-ledger
```

Uses root `action.yml` (monorepo). Consumers pin `@v1`.

### Display name

```
Auto-Ledger & Verify
```

### Tagline (≤160 chars)

```
Fail CI when documentation claims go stale — source-anchored claims for code, docs, and agent decisions.
```

### Description (paste into long description box)

```
Every claim in your docs, PRs, and agent decisions carries a machine-verifiable pointer to its source — and CI fails when the pointer goes stale.

Auto-Ledger & Verify is the GitHub Action from claims-ledger. It parses `.ledger/claims.md`, diffs the ledger on every PR, re-resolves verbatim quote anchors across git/doc/ADR/GitHub/YouTube/timestamp schemes, and annotates the PR when something drifts.

**What it does**
- `mode: verify` — re-resolve anchors; exit 11 when stale (CI red)
- `mode: extract` — mine claims from docs/transcripts (optional OpenRouter)
- `mode: both` — extract + verify in one job
- PR comments + Checks API integration

**Why teams use it**
- Docs rot silently after refactors — this mechanizes the discipline behind fromcopilottocolleague.com (54 claims · 199 anchors · 794-video corpus)
- Anti-hallucination by construction: every anchor carries a verbatim quote that must resolve at the ref
- Self-hosting from day one — no SaaS required

**Exit codes**
- 0 — all anchors fresh
- 11 — stale anchor or unanchored strong claim (configurable via `fail-on`)

**Links**
- Repo: https://github.com/isatimur/claims-ledger
- Demo GIF: https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif
- Sandbox: https://github.com/isatimur/claims-ledger-sandbox
```

### Categories (pick all that apply)

- [x] Code quality
- [x] Continuous integration
- [ ] Monitoring (skip)
- [ ] Project management (skip)
- [ ] Testing (optional — fits doc verification)

### Primary category

```
Code quality
```

### Icon

Upload anchor SVG or select GitHub built-in **anchor** icon (matches `action.yml` branding).

### Pricing

```
Free
```

### Example workflow (Marketplace listing)

```yaml
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
        with:
          mode: verify
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### README excerpt (short blurb for listing card)

```
Source-anchored claims ledgers for codebases and AI agents. CI-gated evidence verification — no anchor, no strong claim. CLI (`edt`) + MCP + GitHub Action.
```

---

## Screenshot checklist (manual, ~5 min)

Before clicking **Publish listing**:

1. [ ] Settings → General → Social preview: upload `docs/social-preview.png` (1280×640)
2. [ ] Settings → General → Description matches tagline above
3. [ ] Actions tab shows green `ledger.yml` on latest `main` commit
4. [ ] Releases page shows `v1.0.0` with `v1` tag
5. [ ] marketplace/new form filled from sections above
6. [ ] Preview listing — verify demo GIF renders
7. [ ] Submit → watch for GitHub review email (1–5 business days)

After approval, add to README:

```markdown
[![Marketplace](https://img.shields.io/badge/Marketplace-Auto--Ledger%20%26%20Verify-orange)](https://github.com/marketplace/actions/auto-ledger-verify)
```

---

## GitHub App (optional — Checks API polish)

If Marketplace review asks for a GitHub App: see [`MARKETPLACE.md`](MARKETPLACE.md) Step 1. Not required for initial listing from a public Action repo.
