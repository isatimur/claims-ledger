# Contributing to claims-ledger

Thanks for helping make claims verifiable. The bar for merging: **tests green, and if your PR
changes behavior that a README/docs claim depends on, `edt verify --gate` must still pass** —
this repo gates itself with its own tool.

## Setup

```bash
git clone https://github.com/isatimur/claims-ledger && cd claims-ledger
npm install
npm test          # vitest across all workspaces
npm run build     # tsc for libs, esbuild bundle for the Action
```

Node ≥ 20. No other toolchain needed (the Python scripts referenced by the conformance suite are
already frozen into `packages/ledger-core/test/fixtures/`).

## Layout

- `packages/ledger-core` — parser (the regex grammar is a byte-compatible port of the book's `build_evidence.py`; its fixtures are the conformance oracle — don't change parser behavior without updating fixtures from the Python reference), anchor schemes, differ, resolver, verifier, panel merge.
- `packages/edt` — the CLI. Thin: commands compose ledger-core.
- `packages/action` — the GitHub Action. `dist/index.js` is committed; run `npm run build -w @claims-ledger/action` and commit the bundle with your change.

## Rules of the road

1. **Conformance is sacred.** `parseBookLedger` must keep matching the Python oracle byte-for-byte. New grammar goes in `parseLedger` (the generalized layer).
2. **Never fabricate.** Anything that can't be verified is reported `unverifiable` or `tentative` — never silently upgraded. Scoring without an API key is *skipped*, not faked.
3. **Exit codes are API.** `0/10/11/12/13/2` are documented in the README and consumed by CI configs; changing them is a breaking change.
4. Conventional commits (`feat(edt): …`, `fix(ledger-core): …`).

## Where to start

See [docs/good-first-issues.md](docs/good-first-issues.md) for a seeded list — transcript
adapters, `edt mcp serve`, the badge worker, and more.
