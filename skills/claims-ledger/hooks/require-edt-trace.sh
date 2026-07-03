#!/usr/bin/env bash
# Require an edt trace when the agent leaves a non-empty git diff.
set -euo pipefail
cat >/dev/null  # consume hook stdin JSON
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi
ROOT=$(git rev-parse --show-toplevel)
EDT="${EDT:-}"
if [ -z "$EDT" ]; then
  if command -v edt >/dev/null 2>&1; then
    EDT=edt
  elif [ -x "$ROOT/node_modules/.bin/edt" ]; then
    EDT="$ROOT/node_modules/.bin/edt"
  elif [ -f "$ROOT/packages/edt/dist/cli.js" ]; then
    EDT="node $ROOT/packages/edt/dist/cli.js"
  fi
fi
if [ -z "$EDT" ]; then
  printf '%s\n' '{"followup_message":"Diff is non-empty. Install edt: npx @claims-ledger/edt init && edt trace new --pr N"}'
  exit 0
fi
if ! $EDT verify --require-trace --gate 2>/dev/null; then
  printf '%s\n' '{"followup_message":"Non-empty diff requires an Evidence Decision Trace. Run: edt trace new && edt trace add-decision --text ... --anchor ... --quote ... && edt render --format pr-body"}'
fi
exit 0
