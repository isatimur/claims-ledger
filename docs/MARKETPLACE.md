# GitHub Marketplace submission — manual steps

The agent cannot click "Submit" on your behalf. Follow this checklist to list
**Auto-Ledger & Verify** on the GitHub Marketplace.

## Automation status (2026-07-03)

| Item | Status |
|------|--------|
| Repo public | ✅ https://github.com/isatimur/claims-ledger |
| Root `action.yml` | ✅ [`action.yml`](../action.yml) → `packages/action/dist/index.js` |
| `packages/action/` dev path | ✅ CI uses `./packages/action` |
| Semver release | ✅ tag `v1.0.0` + floating `v1` |
| Branding (anchor / orange) | ✅ in `action.yml` |
| README Marketplace section | ✅ copy-paste workflow |
| Demo GIF + social preview | ✅ `demo/demo.gif`, `docs/social-preview.png` |
| Mirror repo `auto-ledger-verify` | ✅ https://github.com/isatimur/auto-ledger-verify |
| Marketplace Submit button | ❌ manual — https://github.com/marketplace/new |
| GitHub App (Checks API) | ❌ manual — Step 1 below |

## Prerequisites

- [x] Repo is public: https://github.com/isatimur/claims-ledger
- [x] Action published with a semver tag (`v1` points at latest stable)
- [x] `action.yml` has `branding.icon` and `branding.color` (anchor / orange)
- [x] README has a Marketplace section with copy-paste workflow
- [ ] At least one green CI run on `main` after v1.0.0 push (verify before Submit)

## Step 1 — Create the GitHub App (one-time)

1. Go to https://github.com/settings/apps/new
2. **GitHub App name:** `auto-ledger-verify` (or your preferred slug)
3. **Homepage URL:** `https://github.com/isatimur/claims-ledger`
4. **Webhook:** inactive (Action doesn't need it for verify mode)
5. **Repository permissions:**
   - Contents: Read
   - Checks: Write
   - Pull requests: Write
6. **Where can this GitHub App be installed?** Any account
7. Create the app → note the **App ID**
8. Generate a **private key** (PEM) — store in 1Password, not the repo

## Step 2 — Publish the Action release

Already done for v1.0.0. To refresh floating major:

```bash
cd claims-ledger
git tag v1 -f v1.0.0
git push origin v1 --force-with-lease
git push origin v1.0.0
```

Consumers pin `@v1` for auto-updates within major, or `@v1.0.0` for exact.

## Step 3 — Draft the Marketplace listing

1. Open https://github.com/marketplace/new
2. Choose **Actions**
3. **Action repository:** `isatimur/claims-ledger` (root `action.yml` — monorepo-ready)

> **Namespace note:** Examples may say `isatimur/auto-ledger-verify@v1`. That slug requires
> a mirror repo — see [`ACTION-MIRROR.md`](ACTION-MIRROR.md). Listing from this monorepo uses
> `isatimur/claims-ledger@v1`.

4. **Display name:** Auto-Ledger & Verify
5. **Tagline:** Fail CI when your docs' claims go stale — source-anchored claims for code, docs, and agent decisions.
6. **Description:** paste from README "Why" section + exit codes
7. **Category:** Code quality
8. **Icon:** upload anchor SVG or use GitHub's built-in
9. **Pricing:** Free

## Step 4 — Verification workflow (Marketplace review)

Add this to the listing's "Example workflow":

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
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}  # optional
```

## Step 5 — Submit and respond

- GitHub review takes 1–5 business days
- Respond to review comments within 24h
- After approval, add the Marketplace badge to README:

```markdown
[![Marketplace](https://img.shields.io/badge/Marketplace-Auto--Ledger%20%26%20Verify-orange)](https://github.com/marketplace/actions/auto-ledger-verify)
```

## Optional — dedicated Action repo automation

If you split `isatimur/auto-ledger-verify`, see [`.github/workflows/release-action.yml`](../.github/workflows/release-action.yml)
and [`ACTION-MIRROR.md`](ACTION-MIRROR.md).

## Topics to set on the repo (Settings → General)

```
github-actions, documentation, ci, devops, llm, agents, fact-checking, evidence, markdown, open-source
```

Or via CLI:

```bash
gh repo edit isatimur/claims-ledger \
  --add-topic github-actions --add-topic documentation --add-topic verification \
  --add-topic devtools --add-topic llm --add-topic claims --add-topic evidence
```

## Social preview (Settings → General → Social preview)

**Description (≤350 chars):**

```
Every claim in your docs and agent PRs carries a machine-verifiable pointer to its source. CI fails when the pointer goes stale. GitHub Action + CLI + MCP. Self-hosting from day one.
```

Upload [`docs/social-preview.png`](social-preview.png) (1280×640). See [`SOCIAL-PREVIEW.md`](SOCIAL-PREVIEW.md).
