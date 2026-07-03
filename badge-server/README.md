# Badge server — static JSON via CI (no host)

This folder documents how to keep `.ledger/badge.json` fresh without running a server.

## Regenerate locally

```bash
npm run build
./packages/edt/dist/cli.js verify --gate
# writes .ledger/badge.json
git add .ledger/badge.json && git commit -m "chore: refresh claims badge"
```

## GitHub Actions snippet

Add to `.github/workflows/ledger.yml` (or a dedicated `badge.yml`):

```yaml
  badge:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: ledger
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run build
      - run: ./packages/edt/dist/cli.js verify --gate
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: refresh .ledger/badge.json'
          file_pattern: '.ledger/badge.json'
```

## Consumer repos

Copy the shields markdown from [`docs/BADGE.md`](../docs/BADGE.md).

**book-lab:** `isatimur/ai-engineering-book-lab` already commits `.ledger/badge.json` — enable the workflow above if badge drifts.
