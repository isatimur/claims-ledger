# X thread — launch day (Tuesday, after HN post)

Post after HN is live (~07:35 PT). Space tweets 5–10 minutes apart.

---

## Tweet 1 (hook)

```
Show HN: A GitHub Action that fails CI when your docs' claims go stale.

Every claim in .ledger/claims.md carries a pointer to its source — git line, ADR, YouTube timestamp.

When the source moves, exit 11. CI red.

https://github.com/isatimur/claims-ledger
```

## Tweet 2 (mechanism)

```
The anti-fabrication trick:

Every anchor carries a verbatim quote. The quote either resolves at the ref or it doesn't.

An LLM can hallucinate a justification. It cannot hallucinate a string into a commit.

edt verify → exact match → fuzzy 0.87 → stale
```

## Tweet 3 (event ledger)

```
We fact-checked Sean Grove's "The New Code" talk (OpenAI, 1M+ views).

5 claims. Every one anchored to the exact second.

Sample from our 794-video practitioner corpus — honestly labeled:

https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025
```

## Tweet 4 (try it)

```
Try in 30 seconds — fork the sandbox:

https://github.com/isatimur/claims-ledger-sandbox

Change src/config.ts without updating .ledger/claims.md → Action fails.

edt reanchor claims#1 → green again.
```

## Tweet 5 (agent angle)

```
For agentic coding: attach an Evidence Decision Trace to every PR.

```edt-trace v1
- edt#1 [strong] Moved JWT into gateway/auth/
  ⚓ doc://docs/adr/0007@e91b3d0 "crypto-touching code lives under gateway/auth/"
```

Agents that can't run binaries — the Action parses this server-side.
```
