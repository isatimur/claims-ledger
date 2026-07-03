# Badge — zero-infra README status

The claims badge uses [shields.io endpoint badges](https://shields.io/badges/endpoint-badge) backed by a committed JSON file. **No Cloudflare account required.**

---

## How it works

1. `edt verify` (or the GitHub Action) writes `.ledger/badge.json`
2. Commit the file to your default branch
3. Point shields at the raw GitHub URL

```markdown
[![Claims verified](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FOWNER%2FREPO%2Fmain%2F.ledger%2Fbadge.json)](.ledger/claims.md)
```

Replace `OWNER`, `REPO`, and branch if not `main`.

---

## Schema (`.ledger/badge.json`)

```json
{
  "schemaVersion": 1,
  "label": "claims",
  "message": "5 anchored · 5/5 fresh",
  "color": "brightgreen",
  "cacheSeconds": 3600
}
```

| Color | Meaning |
|-------|---------|
| `brightgreen` | All resolvable anchors fresh |
| `red` | At least one stale anchor |
| `orange` | Ledger exists but anchors need online verify (e.g. yt:// offline) |

---

## Live examples

| Repo | Badge URL |
|------|-----------|
| claims-ledger | https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fisatimur%2Fclaims-ledger%2Fmain%2F.ledger%2Fbadge.json |
| ai-engineering-book-lab | https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fisatimur%2Fai-engineering-book-lab%2Fmain%2F.ledger%2Fbadge.json |

Verify JSON directly:

```bash
curl -s https://raw.githubusercontent.com/isatimur/claims-ledger/main/.ledger/badge.json
```

---

## CI auto-commit (optional)

See [`badge-server/README.md`](../badge-server/README.md) for a workflow snippet that regenerates and commits `.ledger/badge.json` on push to `main`.

**Private repos:** raw.githubusercontent only works for public repos. Use a public fork or Phase 2 hosted worker.

---

## Phase 2 — hosted worker

Future: `https://img.claims-ledger.dev/badge/OWNER/REPO` — same schema, cached read of `ledger.json`. See [`LAUNCH.md`](../LAUNCH.md) § badge.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Badge shows "resource not found" | Commit `.ledger/badge.json`; check branch name in URL |
| Badge stuck orange | Expected for yt-only ledgers offline; add git/doc anchors or enable online verify |
| shields 404 | URL-encode the raw JSON URL (use the markdown snippet above) |
