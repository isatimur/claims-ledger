# Demo run — captured terminal output

Reproduced by `./demo/scenario.sh` on claims-ledger v0.3.0.

```
▸ Demo workspace: /tmp/edt-demo-XXXX

▸ edt init
created .ledger/claims.md
installed .git/hooks/pre-commit (edt verify --only-touched --gate)
ledger workspace ready at .ledger

▸ edt verify --gate  (expect exit 0)
anchors: 1/1 fresh
gate: PASS — all anchored, all fresh
exit code: 0

▸ Break the anchor — rewrite src/session.ts

▸ edt verify --gate  (expect exit 11 — stale anchor)
anchors: 0/1 fresh · 1 stale
✖ claims#1 git://1583d0a/src/session.ts#L1-L1
    quote no longer resolves in src/session.ts (moved/deleted/reworded past fuzzy threshold 0.87)
gate: FAIL — ≥1 stale anchor (exit 11)
exit code: 11

▸ Move the quoted line to src/rotation.ts and commit

▸ edt reanchor claims#1
claims#1: git://1583d0a/src/session.ts#L1-L1
      → git://811e6c2/src/rotation.ts#L1-L1  (exact, score 1.00)
rewrote .ledger/claims.md (1 anchor updated)

▸ edt verify --gate  (expect exit 0 again)
anchors: 1/1 fresh
gate: PASS — all anchored, all fresh
exit code: 0

✓ Demo complete — stale anchor caught (11), reanchor fixed it (0)
```

## Try it yourself

```bash
git clone https://github.com/isatimur/claims-ledger
cd claims-ledger && npm install && npm run build
./demo/scenario.sh
```

See [RECORDING.md](../RECORDING.md) for asciinema / GIF instructions.
