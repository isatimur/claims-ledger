#!/usr/bin/env bash
# Publish a single package if its version is not already on the npm registry.
# Used by npm-publish-token.sh and .github/workflows/npm-publish.yml.
#
# Idempotent: re-running after a successful publish (local or CI) exits 0 with a skip notice.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: npm-publish-package.sh <package-dir>"
  exit 1
fi

PKG_DIR="$1"
cd "${PKG_DIR}"

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"

PUBLISHED=""
if PUBLISHED="$(npm view "${NAME}@${VERSION}" version 2>/dev/null)"; then
  :
else
  PUBLISHED=""
fi

if [[ "${PUBLISHED}" == "${VERSION}" ]]; then
  echo "✓ ${NAME}@${VERSION} already on registry — skipping publish"
  exit 0
fi

echo "→ Publishing ${NAME}@${VERSION}"
npm publish --access public
