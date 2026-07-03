#!/usr/bin/env bash
# Publish @claims-ledger packages to npm (login + OTP path).
# Requires: @claims-ledger org on npm, npm login, 2FA enabled, and NPM_OTP at publish time.
# For granular tokens (CI / no 2FA): use ./scripts/npm-publish-token.sh instead.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TROUBLESHOOT_DOC="${ROOT}/docs/NPM-PUBLISH.md#troubleshooting-403-forbidden--two-factor-authentication-or-granular-access-token-required"

if [[ -n "${NPM_TOKEN:-}" ]]; then
  echo "NPM_TOKEN is set — using token auth via scripts/npm-publish-token.sh (preferred for granular tokens)."
  exec "${ROOT}/scripts/npm-publish-token.sh"
fi

# Preflight: scoped publish needs OTP (with 2FA) or a granular token
if [[ -z "${NPM_OTP:-}" ]]; then
  echo ""
  echo "WARN: No NPM_OTP set. Scoped @claims-ledger/* publish requires 2FA + OTP or a granular token."
  echo "  OTP path:  NPM_OTP=123456 ./scripts/npm-publish.sh   (2FA must be enabled on npm account)"
  echo "  Token path: export NPM_TOKEN=npm_... && ./scripts/npm-publish-token.sh"
  echo "  See: ${TROUBLESHOOT_DOC}"
  echo ""
fi

if ! npm whoami &>/dev/null; then
  echo "Not logged in to npm."
  echo "  Local OTP path: npm login, enable 2FA, then NPM_OTP=123456 ./scripts/npm-publish.sh"
  echo "  Token path:     export NPM_TOKEN=npm_... && ./scripts/npm-publish-token.sh"
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

two_factor_enabled() {
  local tfa_mode=""
  tfa_mode="$(
    npm profile get --json 2>/dev/null \
      | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const m=j.tfa&&j.tfa.mode;process.stdout.write(m&&m!=='disabled'?m:'');}catch{process.exit(1);}});"
  )" || return 1
  [[ -n "${tfa_mode}" ]]
}

check_2fa_enabled() {
  if two_factor_enabled; then
    return 0
  fi
  echo ""
  echo "ERROR: Two-factor authentication is NOT enabled on this npm account."
  echo "NPM_OTP is ignored without 2FA — publish will return 403."
  echo ""
  echo "  Fix A: Enable 2FA at https://www.npmjs.com/settings/~/security"
  echo "         then: NPM_OTP=123456 ./scripts/npm-publish.sh"
  echo ""
  echo "  Fix B: Use a granular publish token (bypass 2FA):"
  echo "         export NPM_TOKEN=npm_... && ./scripts/npm-publish-token.sh"
  echo ""
  echo "  Full guide: ${TROUBLESHOOT_DOC}"
  exit 1
}

if [[ -n "${NPM_OTP:-}" ]]; then
  check_2fa_enabled
elif ! two_factor_enabled; then
  echo ""
  echo "WARN: 2FA is disabled — publish will fail with 403 unless you set NPM_OTP after enabling 2FA"
  echo "      or switch to: export NPM_TOKEN=npm_... && ./scripts/npm-publish-token.sh"
  echo ""
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
    echo "  Option B — Granular Access Token (Packages: Read and write,"
    echo "    scope @claims-ledger, enable bypass 2FA for automation):"
    echo "    export NPM_TOKEN=npm_... && ./scripts/npm-publish-token.sh"
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
  output="$(
    cd "${dir}" && npm publish --access public ${NPM_OTP:+--otp="${NPM_OTP}"} 2>&1
  )" || status=$?
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
