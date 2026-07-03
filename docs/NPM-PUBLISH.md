# npm publish — @claims-ledger/edt

**Status (Jul 3, 2026):** Package is **not yet published**. `@claims-ledger/edt` returns 404 on npm. Local `npm whoami` is unauthenticated — publish requires user login.

---

## Readiness checklist

| Item | Status |
|------|--------|
| `packages/edt/package.json` name `@claims-ledger/edt` | ✅ |
| Version `1.0.0` aligned with git tag | ✅ |
| `bin.edt` → `dist/cli.js` with shebang | ✅ |
| `files: ["dist"]` — only compiled output shipped | ✅ |
| `@claims-ledger/ledger-core` dependency at `1.0.0` | ✅ (must publish core first or use `publishConfig.access`) |
| Build passes | Run `npm run build` |
| Tests pass | Run `npm test` |
| Dry-run clean | Run steps below |

---

## Step 0 — Create npm org (if needed)

The `@claims-ledger` scope does not exist on npm yet.

1. Log in: `npm login`
2. Create org at https://www.npmjs.com/org/create — name: `claims-ledger`
3. Or publish as unscoped `edt-cli` (not recommended — breaks README `npx @claims-ledger/edt` references)

---

## Step 1 — Publish ledger-core first

`@claims-ledger/edt` depends on `@claims-ledger/ledger-core@1.0.0`. Publish core before edt:

```bash
cd packages/ledger-core
npm run build
npm publish --access public --dry-run   # inspect tarball
npm publish --access public
```

Verify: `npm view @claims-ledger/ledger-core version`

---

## Step 2 — Dry-run edt

```bash
cd packages/edt
npm run build
npm test
npm publish --access public --dry-run
```

Inspect output for:
- Only `dist/` files included
- `cli.js` has shebang
- No `.env`, secrets, or test fixtures

Expected tarball contents (~):
```
package/package.json
package/dist/cli.js
package/dist/index.js
package/dist/*.d.ts
package/dist/*.js.map
```

---

## Step 3 — Publish edt

```bash
cd packages/edt
npm publish --access public
```

Verify:

```bash
npm view @claims-ledger/edt
npx @claims-ledger/edt --help
```

---

## Step 4 — Update README badge

Replace placeholder npm badge if it 404s before publish:

```markdown
[![npm](https://img.shields.io/npm/v/@claims-ledger/edt)](https://www.npmjs.com/package/@claims-ledger/edt)
```

---

## Version bumps (post v1.0.0)

Monorepo workspaces — bump in lockstep:

```bash
# packages/ledger-core/package.json
# packages/edt/package.json  → "dependencies": { "@claims-ledger/ledger-core": "1.0.1" }
npm run build && npm test
git tag v1.0.1 && git push --tags
npm publish --access public   # in each package directory
```

---

## CI publish (manual dispatch)

Workflow added: [`.github/workflows/npm-publish.yml`](../.github/workflows/npm-publish.yml)

1. Create npm org `@claims-ledger` at https://www.npmjs.com/org/create
2. Generate an **Automation** token at https://www.npmjs.com/settings/~/tokens
3. Add repo secret **`NPM_TOKEN`** (Settings → Secrets → Actions)
4. Run **Actions → npm-publish → Run workflow** on `main`

Publishes `ledger-core` first, then `edt`. Verify with `npm view @claims-ledger/edt`.

Local fallback after `npm login`:

```bash
./scripts/npm-publish.sh
```

---

## Blockers right now

1. **npm org `@claims-ledger` does not exist** — create before publish
2. **Not logged in locally** — `npm whoami` returns 401; use CI workflow with `NPM_TOKEN` or `npm login`
3. **`ledger-core` must publish first** — edt depends on it at registry version, not workspace link

Do **not** publish until user confirms org ownership and HN timing (optional: publish same morning as HN so `npx @claims-ledger/edt init` works in Show HN comments).

---

## One-liner (after login)

```bash
chmod +x scripts/npm-publish.sh && ./scripts/npm-publish.sh
```

Or step-by-step:

```bash
npm login
npm whoami
npm run build && npm test
cd packages/ledger-core && npm publish --access public --dry-run && npm publish --access public
cd ../edt && npm publish --access public --dry-run && npm publish --access public
npx @claims-ledger/edt --help
```
