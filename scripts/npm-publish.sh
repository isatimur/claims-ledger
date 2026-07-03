#!/usr/bin/env bash
# Publish @claims-ledger packages to npm (requires npm login + @claims-ledger org).
set -euo pipefail
cd "$(dirname "$0")/.."
npm whoami || { echo "Run: npm login"; exit 1; }
npm run build && npm test
(cd packages/ledger-core && npm publish --access public)
(cd packages/edt && npm publish --access public)
echo "Done. Verify: npx @claims-ledger/edt --help"
