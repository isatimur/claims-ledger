# npm publish — @claims-ledger/edt

**Status (Jul 3, 2026):** `@claims-ledger` org **does not exist on npm yet** — create it first (Step 0). Packages are not published. Publishing scoped packages also requires **2FA + OTP** or a **granular access token with publish scope** (see Troubleshooting).

---

## Readiness checklist

| Item | Status |
|------|--------|
| `packages/edt/package.json` name `@claims-ledger/edt` | ✅ |
| Version `1.0.0` aligned with git tag | ✅ |
| `bin.edt` → `dist/cli.js` with shebang | ✅ |
| `files: ["dist"]` — only compiled output shipped | ✅ |
| `@claims-ledger/ledger-core` dependency at `1.0.0` | ✅ (must publish core first) |
| Build passes | Run `npm run build` |
| Tests pass | Run `npm test` |
| npm org `@claims-ledger` exists | ❌ create at Step 0 |
| Auth ready for publish (2FA or granular token) | See Troubleshooting |

---

## Step 0 — Create npm org (required)

The `@claims-ledger` scope does **not** exist on npm yet. You must create it before any publish:

1. Log in: `npm login` (as org owner, e.g. `isatimur`)
2. Create org at **https://www.npmjs.com/org/create** — name: **`claims-ledger`**
3. Confirm: `npm org ls claims-ledger` (should list members, not 404)

Without this org, publish fails with scope/permission errors even if login succeeds.

---

## Step 1 — Publish ledger-core first

`@claims-ledger/edt` depends on `@claims-ledger/ledger-core@1.0.0`. Publish core before edt:

```bash
cd packages/ledger-core
npm run build
npm publish --access public --dry-run   # inspect tarball
npm publish --access public             # add --otp=123456 if using 2FA
```

Verify: `npm view @claims-ledger/ledger-core version`

Or use the helper script (after Step 0 + auth setup):

```bash
NPM_OTP=123456 ./scripts/npm-publish.sh   # if 2FA enabled
./scripts/npm-publish.sh                    # if NPM_TOKEN is a granular publish token
```

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
npm publish --access public               # add --otp=123456 if using 2FA
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

Workflow: [`.github/workflows/npm-publish.yml`](../.github/workflows/npm-publish.yml)

1. Create npm org `@claims-ledger` at https://www.npmjs.com/org/create (Step 0)
2. Create a **Granular Access Token** at https://www.npmjs.com/settings/~/tokens:
   - Type: **Granular Access Token**
   - Packages and scopes → **Read and write**
   - Select org **`@claims-ledger`**
   - Enable **“Bypass two-factor authentication for automation”** if shown
3. Add repo secret **`NPM_TOKEN`** = that granular publish token (Settings → Secrets → Actions)
   - **Not** a classic read-only token
   - **Not** a session token from `npm login`
4. Run **Actions → npm-publish → Run workflow** on `main`

Publishes `ledger-core` first, then `edt`. Verify with `npm view @claims-ledger/edt`.

**Re-running is safe:** the workflow checks the registry before each publish. If a version is already live (e.g. you published locally first), that package is skipped and the job exits successfully.

Local fallback after auth is configured:

```bash
chmod +x scripts/npm-publish.sh && ./scripts/npm-publish.sh
```

---

## Troubleshooting: 403 Forbidden — “Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages”

This is the expected error when you run `npm login` and try to publish a **scoped** package without meeting npm’s publish auth policy.

**`npm login` alone is NOT sufficient** if your account/org requires 2FA for publish.

### Option A — Enable 2FA on your npm account (interactive local publish)

1. Enable 2FA at https://www.npmjs.com/settings/~/security (Authorization and Publishing, or both)
2. Publish with a one-time password from your authenticator app:

```bash
npm publish --access public --otp=123456
# or via helper script:
NPM_OTP=123456 ./scripts/npm-publish.sh
```

### Option B — Granular Access Token (recommended for CI and scripted publish)

1. Go to https://www.npmjs.com/settings/~/tokens → **Generate New Token** → **Granular Access Token**
2. Configure:
   - **Packages and scopes** → **Read and write**
   - **Organizations** → select **`@claims-ledger`**
   - Enable **“Bypass two-factor authentication for automation”** when available
3. Copy the token once (starts with `npm_`) and use it as `NPM_TOKEN`:

```bash
export NPM_TOKEN=npm_xxxxxxxx   # do not commit this
npm whoami                        # should print your username
./scripts/npm-publish.sh
```

For CI, store the same token in GitHub secret **`NPM_TOKEN`**.

**Rotate any token that was pasted in chat or committed by mistake.**

### Option C — GitHub Actions `NPM_TOKEN` must be a publish token

The workflow secret must be the **granular publish token** from Option B:

- ✅ Granular token, Read and write, `@claims-ledger` scope, bypass 2FA enabled
- ❌ Classic **read-only** token
- ❌ Token from `npm login` session (not valid in CI)

### Other blockers

| Symptom | Fix |
|---------|-----|
| `Scope not found` / org 404 | Complete **Step 0** — create org `claims-ledger` |
| `404` on `npm view @claims-ledger/ledger-core` | Normal before first publish; publish core first |
| edt publish fails on missing dependency | Publish `@claims-ledger/ledger-core` before `@claims-ledger/edt` |

---

## One-liner (after org + auth)

```bash
chmod +x scripts/npm-publish.sh && NPM_OTP=123456 ./scripts/npm-publish.sh
```

Or step-by-step:

```bash
npm login
npm whoami
npm org ls claims-ledger          # must not 404
npm run build && npm test
cd packages/ledger-core && npm publish --access public --otp=123456
cd ../edt && npm publish --access public --otp=123456
npx @claims-ledger/edt --help
```

Do **not** publish until org exists and auth (2FA or granular token) is configured.
