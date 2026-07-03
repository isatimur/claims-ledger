# GitHub Marketplace submission — manual steps

The agent cannot click "Submit" on your behalf. Follow this checklist to list
**Auto-Ledger & Verify** on the GitHub Marketplace.

## Prerequisites

- [ ] Repo is public: https://github.com/isatimur/claims-ledger
- [ ] Action published with a semver tag (`v1` points at latest stable)
- [ ] `action.yml` has `branding.icon` and `branding.color` (already set: anchor / orange)
- [ ] README has a Marketplace section with copy-paste workflow (see below)
- [ ] At least one green CI run on `main`

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

```bash
cd claims-ledger
git tag v1 -f $(git rev-list -n 1 v0.3.0)   # floating major tag
git push origin v1 --force-with-lease
```

Consumers pin `@v1` for auto-updates within major, or `@v0.3.0` for exact.

## Step 3 — Draft the Marketplace listing

1. Open https://github.com/marketplace/new
2. Choose **Actions**
3. **Action repository:** `isatimur/claims-ledger` (path: `packages/action/action.yml` if monorepo — you may need a dedicated `isatimur/auto-ledger-verify` repo that re-exports, or list from the monorepo root if GitHub allows)

> **Monorepo note:** GitHub Marketplace typically expects `action.yml` at repo root.
> Options:
> - **A (recommended):** Create `isatimur/auto-ledger-verify` repo mirroring `packages/action/dist` + root `action.yml` (release bot copies on tag).
> - **B:** Symlink / composite — document in README that consumers use `isatimur/claims-ledger/packages/action@main` until the mirror repo exists.

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
      - uses: isatimur/auto-ledger-verify@v1
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

If you split `isatimur/auto-ledger-verify`:

```yaml
# .github/workflows/release-action.yml in claims-ledger
on:
  push:
    tags: ['v*']
jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cp packages/action/action.yml /tmp/
          cp -r packages/action/dist /tmp/dist
      - uses: softprops/action-gh-release@v2
        with:
          repository: isatimur/auto-ledger-verify
          files: /tmp/**
```

## Topics to set on the repo (Settings → General)

```
github-actions, documentation, ci, devops, llm, agents, fact-checking, evidence, markdown, open-source
```

## Social preview (Settings → General → Social preview)

**Description (≤350 chars):**

```
Every claim in your docs and agent PRs carries a machine-verifiable pointer to its source. CI fails when the pointer goes stale. GitHub Action + CLI + MCP. Self-hosting from day one.
```

Upload a 1280×640 image: terminal screenshot of `./demo/scenario.sh` showing exit 11 → reanchor → exit 0.
