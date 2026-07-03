#!/usr/bin/env bash
# Sync Action artifacts to isatimur/auto-ledger-verify mirror repo.
# Usage: TAG=v1.0.0 ./scripts/sync-action-mirror.sh
# Requires: gh CLI authenticated, mirror repo exists.
set -euo pipefail

TAG="${TAG:-$(git describe --tags --abbrev=0 2>/dev/null || echo v1.0.0)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIRROR="/tmp/auto-ledger-verify-sync"
REPO="isatimur/auto-ledger-verify"

echo "Syncing claims-ledger ${TAG} → ${REPO}"

rm -rf "$MIRROR"
git clone --depth 1 "https://github.com/${REPO}.git" "$MIRROR" 2>/dev/null || {
  mkdir -p "$MIRROR"
  cd "$MIRROR"
  git init
  git checkout -b main
}

mkdir -p "$MIRROR/dist" "$MIRROR/examples"
sed 's|packages/action/dist/index.js|dist/index.js|' "$ROOT/action.yml" > "$MIRROR/action.yml"
cp -r "$ROOT/packages/action/dist/"* "$MIRROR/dist/"
cp "$ROOT/examples/ledger.yml" "$MIRROR/examples/ledger.yml"

cat > "$MIRROR/README.md" <<'EOF'
# auto-ledger-verify

> **Fail CI when your docs' claims go stale** — source-anchored claims for code, docs, and agent decisions.

Marketplace-friendly namespace for the [claims-ledger](https://github.com/isatimur/claims-ledger) GitHub Action.

## Usage

```yaml
- uses: isatimur/auto-ledger-verify@v1
  with:
    mode: verify
```

Copy the full workflow from [`examples/ledger.yml`](examples/ledger.yml).

## Source

This repo is a release mirror. Development happens in [isatimur/claims-ledger](https://github.com/isatimur/claims-ledger).

Synced on each semver tag via `scripts/sync-action-mirror.sh`.
EOF

if [[ ! -f "$MIRROR/LICENSE" ]]; then
  cp "$ROOT/LICENSE" "$MIRROR/LICENSE" 2>/dev/null || true
fi

cd "$MIRROR"
git add -A
if git diff --staged --quiet; then
  echo "No changes to sync."
else
  git commit -m "sync: mirror ${TAG} from claims-ledger"
fi

git tag -f "$TAG"
MAJOR="${TAG%%.*}"
git tag -f "$MAJOR" "$TAG"

git push origin main
git push origin "$TAG" --force
git push origin "$MAJOR" --force

echo "Done: https://github.com/${REPO}/releases/tag/${TAG}"
