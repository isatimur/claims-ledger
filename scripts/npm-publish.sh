#!/usr/bin/env bash
# Publish @claims-ledger packages to npm.
# Requires: @claims-ledger org on npm + either 2FA+OTP or a granular publish token.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TROUBLESHOOT_DOC="${ROOT}/docs/NPM-PUBLISH.md#troubleshooting-403-forbidden--two-factor-authentication-or-granular-access-token-required"

NPM_PUBLISH_ARGS=(--access public)
if [[ -n "${NPM_OTP:-}" ]]; then
  NPM_PUBLISH_ARGS+=(--otp="${NPM_OTP}")
fi

if ! npm whoami &>/dev/null; then
  echo "Not logged in to npm."
  echo "  Local: npm login   (then publish with 2FA — see docs/NPM-PUBLISH.md)"
  echo "  Or set NPM_TOKEN to a granular publish token for @claims-ledger"
  exit 1
fi

echo "Publishing as: $(npm whoami)"

if ! npm org ls claims-ledger &>/dev/null; then
  echo ""
  echo "ERROR: npm org @claims-ledger does not exist (or you are not a member)."
  echo "Create the org at https://www.npmjs.com/org/create — name: claims-ledger"
  echo "See Step 0 in docs/NPM-PUBLISH.md"
  exit 1
fi

print_403_help() {
  local output="$1"
  if echo "$output" | grep -q "403 Forbidden" &&
     echo "$output" | grep -qiE "two-factor|granular access token|bypass 2fa"; then
    echo ""
    echo "ERROR: npm publish returned 403 — scoped publish requires 2FA or a granular token."
    echo ""
    echo "  Option A — Enable 2FA on your npm account, then:"
    echo "    NPM_OTP=123456 ./scripts/npm-publish.sh"
    echo ""
    echo "  Option B — Create a Granular Access Token (Packages: Read and write,"
    echo "    scope @claims-ledger, enable bypass 2FA for automation) and use it:"
    echo "    export NPM_TOKEN=npm_...   # then npm whoami should work"
    echo ""
    echo "  npm login alone is NOT enough when npm enforces 2FA for publish."
    echo "  Full guide: ${TROUBLESHOOT_DOC}"
  fi
}

publish_package() {
  local dir="$1"
  local name="$2"
  local output=""
  local status=0

  echo ""
  echo "==> Publishing ${name} from ${dir}"
  output="$(cd "${dir}" && npm publish "${NPM_PUBLISH_ARGS[@]}" 2>&1)" || status=$?
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
