#!/usr/bin/env bash
# Publish @claims-ledger packages using a granular npm access token (preferred for CI/automation).
#
# Prerequisites:
#   - npm org @claims-ledger exists (https://www.npmjs.com/org/create)
#   - Granular Access Token with Read+Write on @claims-ledger and "bypass 2FA" enabled
#
# Usage (do not commit or paste the token):
#   export NPM_TOKEN=npm_xxxxxxxx
#   ./scripts/npm-publish-token.sh
#
# Writes a temporary project-root .npmrc (gitignored), publishes both packages, then removes it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TROUBLESHOOT_DOC="${ROOT}/docs/NPM-PUBLISH.md#troubleshooting-403-forbidden--two-factor-authentication-or-granular-access-token-required"
NPMRC="${ROOT}/.npmrc"

if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "ERROR: NPM_TOKEN is not set."
  echo ""
  echo "Create a Granular Access Token at https://www.npmjs.com/settings/~/tokens:"
  echo "  - Packages and scopes → Read and write → @claims-ledger"
  echo "  - Enable bypass two-factor authentication for automation"
  echo ""
  echo "Then:"
  echo "  export NPM_TOKEN=npm_xxxxxxxx"
  echo "  ./scripts/npm-publish-token.sh"
  echo ""
  echo "See: ${TROUBLESHOOT_DOC}"
  exit 1
fi

cleanup() {
  if [[ -f "${NPMRC}" ]]; then
    rm -f "${NPMRC}"
  fi
}
trap cleanup EXIT

# Drop any interactive login session so token auth is used exclusively
npm logout --registry=https://registry.npmjs.org/ 2>/dev/null || true

cat > "${NPMRC}" <<EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

if ! npm whoami &>/dev/null; then
  echo "ERROR: npm whoami failed with NPM_TOKEN — token may be invalid, expired, or read-only."
  echo "Use a Granular Access Token with Read and write on @claims-ledger."
  echo "See: ${TROUBLESHOOT_DOC}"
  exit 1
fi

echo "Publishing as: $(npm whoami) (token auth)"

if ! npm org ls claims-ledger &>/dev/null; then
  echo ""
  echo "ERROR: npm org @claims-ledger does not exist (or token lacks org access)."
  echo "Create the org at https://www.npmjs.com/org/create — name: claims-ledger"
  exit 1
fi

print_403_help() {
  local output="$1"
  if echo "$output" | grep -q "403 Forbidden" &&
     echo "$output" | grep -qiE "two-factor|granular access token|bypass 2fa"; then
    echo ""
    echo "ERROR: npm publish returned 403 — token lacks publish permission or bypass-2FA."
    echo ""
    echo "Regenerate a Granular Access Token with:"
    echo "  - Packages and scopes → Read and write → @claims-ledger"
    echo "  - Bypass two-factor authentication for automation → enabled"
    echo ""
    echo "Full guide: ${TROUBLESHOOT_DOC}"
  fi
}

publish_package() {
  local dir="$1"
  local name="$2"
  local output=""
  local status=0

  echo ""
  echo "==> Publishing ${name} from ${dir}"
  output="$(cd "${dir}" && npm publish --access public 2>&1)" || status=$?
  echo "${output}"

  if [[ "${status}" -ne 0 ]]; then
    print_403_help "${output}"
    exit "${status}"
  fi
}

npm run build && npm test
publish_package packages/ledger-core "@claims-ledger/ledger-core"
publish_package packages/edt "@claims-ledger/edt"
echo ""
echo "Done. Verify: npx @claims-ledger/edt --help"
