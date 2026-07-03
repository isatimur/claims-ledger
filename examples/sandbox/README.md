# Sandbox — minimal repo that runs claims-ledger on every PR

This directory is a **copy-paste template** for a public demo repo. It proves the
Action works on a repo you don't control.

## One-click fork (recommended)

```bash
# Create a public sandbox from this template
gh repo create my-claims-sandbox --public --clone
cd my-claims-sandbox

# Copy sandbox files from claims-ledger
curl -sL https://raw.githubusercontent.com/isatimur/claims-ledger/main/examples/sandbox/.ledger/claims.md \
  -o .ledger/claims.md
mkdir -p .github/workflows
curl -sL https://raw.githubusercontent.com/isatimur/claims-ledger/main/examples/sandbox/.github/workflows/ledger.yml \
  -o .github/workflows/ledger.yml

git add -A && git commit -m "feat: claims-ledger sandbox" && git push
```

Open a PR that edits `src/config.ts` without updating `.ledger/claims.md` — the check fails.

## What's in this sandbox

| File | Purpose |
|------|---------|
| `.ledger/claims.md` | One anchored claim about `API_TIMEOUT_MS` |
| `.github/workflows/ledger.yml` | Runs `isatimur/auto-ledger-verify@v1` on every PR |
| `src/config.ts` | The file the claim points at |

## Break-the-build exercise

1. Change the timeout constant in `src/config.ts` without updating the quote in `.ledger/claims.md`
2. Push — Action reports **stale anchor** (exit 11)
3. Run `edt reanchor claims#1` locally, commit, push — check goes green

## Badge

After your first green verify on `main`, commit `.ledger/badge.json`:

```markdown
[![Claims verified](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FOWNER%2FREPO%2Fmain%2F.ledger%2Fbadge.json)](.ledger/claims.md)
```

Replace `OWNER/REPO` with your sandbox repo.
