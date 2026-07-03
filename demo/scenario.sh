#!/usr/bin/env bash
# Reproducible 60-second demo: init → anchor → verify → break → reanchor → verify
# Run from repo root: ./demo/scenario.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EDT="${EDT:-node $ROOT/packages/edt/dist/cli.js}"
DEMO_DIR="$(mktemp -d)"
trap 'rm -rf "$DEMO_DIR"' EXIT

echo "▸ Demo workspace: $DEMO_DIR"
cd "$DEMO_DIR"

git init -q
git config user.email "demo@claims-ledger.dev"
git config user.name "claims-ledger demo"

mkdir -p src
cat > src/session.ts <<'EOF'
export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
export function rotate() {}
EOF
git add -A
git commit -qm "init"

echo ""
echo "▸ edt init"
$EDT init

SHA=$(git rev-parse --short HEAD)
cat >> .ledger/claims.md <<EOF

## 1) Session tokens rotate every 24 hours
- **Support level:** strong
- **Scopes:** session
  - **Anchor:** \`git://${SHA}/src/session.ts#L1-L1\` · confidence: high
    - **Quote:** "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;"
EOF

echo ""
echo "▸ edt verify --gate  (expect exit 0)"
$EDT verify --gate
echo "exit code: $?"

echo ""
echo "▸ Break the anchor — rewrite src/session.ts"
cat > src/session.ts <<'EOF'
// completely different file now
export function nothing() {}
EOF

echo ""
echo "▸ edt verify --gate  (expect exit 11 — stale anchor)"
set +e
$EDT verify --gate
CODE=$?
set -e
echo "exit code: $CODE"
test "$CODE" -eq 11

echo ""
echo "▸ Move the quoted line to src/rotation.ts and commit"
cat > src/rotation.ts <<'EOF'
export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
EOF
git add -A
git commit -qm "move rotation constant" --no-verify

echo ""
echo "▸ edt reanchor claims#1"
$EDT reanchor claims#1
grep -q "src/rotation.ts" .ledger/claims.md

echo ""
echo "▸ edt verify --gate  (expect exit 0 again)"
$EDT verify --gate
echo "exit code: $?"

echo ""
echo "✓ Demo complete — stale anchor caught (11), reanchor fixed it (0)"
