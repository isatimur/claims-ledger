# Action namespace — `isatimur/auto-ledger-verify` vs monorepo root

README and examples reference `isatimur/auto-ledger-verify@v1` for a clean Marketplace
slug. **The mirror repo is live:** https://github.com/isatimur/auto-ledger-verify

## Use now (monorepo root Action)

```yaml
- uses: isatimur/claims-ledger@v1
  with:
    mode: verify
```

Pin an exact release: `@v1.0.0`. Floating major: `@v1`.

The root [`action.yml`](../action.yml) entrypoint is `packages/action/dist/index.js`.
Local development and CI in this repo continue to use `./packages/action`.

## Optional mirror repo (Marketplace slug `auto-ledger-verify`)

GitHub Marketplace listings often prefer a dedicated repo name matching the Action slug.
To serve `isatimur/auto-ledger-verify@v1` without changing consumer YAML:

### One-time setup

1. Create public repo `isatimur/auto-ledger-verify` (empty, MIT).
2. On each `claims-ledger` release tag, copy artifacts:

```bash
TAG=v1.0.0
git clone --depth 1 --branch "$TAG" https://github.com/isatimur/claims-ledger /tmp/cl
cd /tmp/cl
cp action.yml /tmp/release/
cp -r packages/action/dist /tmp/release/dist
# Edit action.yml main: 'dist/index.js' for the mirror layout
sed 's|packages/action/dist/index.js|dist/index.js|' action.yml > /tmp/release/action.yml
```

3. Tag the mirror repo with the same semver (`v1.0.0`, floating `v1`).

### Automated mirror (recommended)

Add [`.github/workflows/release-action.yml`](../.github/workflows/release-action.yml)
(see [`docs/MARKETPLACE.md`](MARKETPLACE.md)) to push `action.yml` + `dist/` to
`isatimur/auto-ledger-verify` on every `v*` tag.

### Marketplace submission

- **From monorepo:** list `isatimur/claims-ledger` — root `action.yml` satisfies the
  “action at repo root” requirement.
- **From mirror:** list `isatimur/auto-ledger-verify` — update `main` path to `dist/index.js`.

Until the mirror exists, update consumer workflows to `isatimur/claims-ledger@v1` or keep
the `auto-ledger-verify` name as a forward-compatible alias once the mirror is live.
