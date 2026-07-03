# GitHub discovery — topics, stars, notifications

## Repository topics (set on github.com/isatimur/claims-ledger → About → Topics)

```
documentation
github-actions
ci-cd
developer-tools
llm
ai-agents
mcp
open-source
typescript
devops
technical-debt
```

Also add to **claims-ledger-sandbox** and **auto-ledger-verify** mirror:

```
documentation
github-actions
demo
template
```

---

## Star ask template (DM or email to friendly devs)

**Subject:** Quick favor — star + try our doc-CI tool launching Jul 7?

**Body:**

```
Hey [Name],

Launching claims-ledger on Show HN Tuesday Jul 7 (~07:30 PT). It's CI that fails when documentation claims go stale — every strong claim carries a verbatim quote anchor (git/doc/ADR/gh/yt/ts schemes).

If you have 60 seconds:
1. Star: https://github.com/isatimur/claims-ledger
2. Fork sandbox: https://github.com/isatimur/claims-ledger-sandbox

The demo script shows verify → break anchor → exit 11 → reanchor → pass. Born from anchoring 54 claims to a 794-video practitioner corpus for https://fromcopilottocolleague.com.

No pressure to post publicly — a star + honest feedback in issues is gold.

Thanks,
Timur
```

**Short X DM variant:**

```
Launching claims-ledger Tue on HN — CI that fails when docs lie (verbatim quote anchors, exit 11 on stale). Would mean a lot if you'd star + fork the sandbox: github.com/isatimur/claims-ledger — no public post needed 🙏
```

---

## Who to notify (AI eng practitioners from book corpus)

High-recognition speakers whose talks appear in event ledgers or flagship claims — notify **after** HN post goes live, not before. Frame as "we anchored your talk" not "please promote us."

| Person | Affiliation | Talk / relevance | Handle (verify before DM) |
|--------|-------------|------------------|---------------------------|
| Ryan Lopopolo | OpenAI | Harness Engineering ledger | @rlopopolo |
| Sean Grove | OpenAI | The New Code ledger (1M+ views) | @sean_a_grove |
| Eric Zakariasson | Cursor | Software Factory ledger | @eric_zk |
| Harrison Chase | LangChain | Agent architecture claims in corpus | @hwchase17 |
| Barry Zhang | Anthropic | Agent expertise claims | (LinkedIn / X — verify) |
| Mahesh Murag | Anthropic | Tool-use / agent claims | (verify) |
| Joel Hron | Thomson Reuters | Agency / deep research claims | (verify) |
| Preeti Somal | Temporal | Durable workflow claims | (verify) |
| Samuel Colvin | Pydantic | Structured output / validation | @samuel_colvin |
| Maggie Appleton | GitHub | Multi-agent alignment talk | @maggieappleton |
| Max Kanat-Alexander | Capital One | Code review as primary job | (verify) |
| Lawrence Jones | incident.io | Eval / reliability claims | (verify) |

**Do NOT cold-DM all of these.** Pick 3–5 with direct ledger/corpus ties. Lead with the live ledger link:

> We published a fact-checked event ledger of your [talk title] — every claim clicks to the exact second: [URL]. Open-source tooling; happy to fix any anchor if the timestamp is off.

---

## Friendly repos for badge onboarding (Phase 2)

Ask maintainers who already star the book lab:

- `isatimur/ai-engineering-book-lab` (done)
- Personal OSS repos with ADRs or heavy docs
- Teams using Cursor/Claude Code with `.cursor/rules` — natural fit for `.ledger/claims.md`

Badge snippet:

```markdown
[![Claims verified](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FOWNER%2FREPO%2Fmain%2F.ledger%2Fbadge.json)](.ledger/claims.md)
```

---

## HN / Reddit discovery (reference only — user posts manually)

- Show HN: `docs/SHOW-HN.md`
- r/programming: `docs/REDDIT-r-programming.md`
- Do not cross-post same day as HN

---

## Metrics to track post-launch

| Signal | Where |
|--------|-------|
| GitHub stars | github.com/isatimur/claims-ledger |
| Sandbox forks | github.com/isatimur/claims-ledger-sandbox |
| npm downloads | npmjs.com/package/@claims-ledger/edt (after publish) |
| HN rank | news.ycombinator.com/item?id=… |
| Action installs | Marketplace insights (after listing live) |
| Ledger page views | fromcopilottocolleague.com/ledgers/* |
