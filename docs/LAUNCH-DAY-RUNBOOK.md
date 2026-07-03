# Launch day runbook — Monday Jul 7, 2026

**Timezone:** Pacific (PT). HN post **07:30 PT**.

**Do not post anything until 07:30 PT** unless this runbook says otherwise.

---

## Pre-flight (06:00–07:25 PT)

| Time | Action | Owner |
|------|--------|-------|
| 06:00 | Coffee. Open tabs: HN submit, repo, sandbox, book site, GitHub Actions | User |
| 06:15 | Verify CI green: `gh run list --repo isatimur/claims-ledger --limit 3` | User |
| 06:20 | Verify book site live: homepage CTA, `/ledgers`, third ledger page | User |
| 06:30 | Copy title + URL from `docs/HN-POST-READY.txt` into HN draft (don't submit) | User |
| 06:35 | Copy first comment from `docs/SHOW-HN.md` into clipboard / text file | User |
| 06:40 | Queue X thread draft from `docs/X-THREAD.md` — **do not post until T+4h** | User |
| 06:45 | Confirm demo GIF loads: `github.com/isatimur/claims-ledger/blob/main/demo/demo.gif` | User |
| 07:00 | Social preview image uploaded? (`docs/SOCIAL-PREVIEW.md`) — optional but helps OG | User |
| 07:15 | Marketplace listing submitted? (`docs/MARKETPLACE.md`) — optional for day 1 | User |
| 07:25 | Deep breath. HN tab ready. First comment ready. Phone on silent. | User |

---

## T = 07:30 PT — Show HN

| Time | Action |
|------|--------|
| **07:30** | Submit Show HN |
| | **Title:** `Show HN: A GitHub Action that fails CI when your docs' claims go stale` |
| | **URL:** `https://github.com/isatimur/claims-ledger` |
| **07:31** | Post **first comment** (maker walkthrough from `docs/SHOW-HN.md`) — within 60 seconds |
| **07:32–08:00** | Monitor rank. Reply to every comment within 15 min. Link to demo, sandbox, event ledgers. |
| **08:00** | Screenshot HN rank + points for metrics log |

### HN comment response cheatsheet

**"How is this different from link checking?"**
> Link checkers verify URLs resolve. We verify the *claim* still matches a verbatim quote at the anchor ref — semantic drift, not broken links. Refactor moves `rotate.ts`, the sentence "tokens rotate every 24h" still reads fine but the quote no longer resolves → exit 11.

**"LLMs will just make up quotes."**
> Fabricated quotes are rejected at `edt add-decision` time — the quote must resolve at the ref or it's rejected. The anti-hallucination trick is requiring a substring that either matches or doesn't; models can't negotiate fuzzy truth into a git blob.

**"Too much overhead for small teams."**
> Start with 3–5 claims on your most-refactored modules. The sandbox fork + `./demo/scenario.sh` takes 60 seconds. The Action is one YAML line. Overhead scales with claim count, not repo size.

**"Why not just use RAG / citations?"**
> RAG retrieves context; it doesn't gate CI. claims-ledger is a *verification* layer — same grammar we used to anchor 54 claims to 794 videos ([evidence graph](https://fromcopilottocolleague.com/read/graph)). RAG complements; it doesn't replace stale-doc detection.

**"YouTube anchors can't verify offline."**
> Correct — `yt://` anchors report unverifiable offline (badge shows orange, not green-washed). Event ledgers are honestly labeled corpus samples. Code anchors (`git://`, `doc://`) verify fully offline.

**"Is this published on npm?"**
> [If published:] `npx @claims-ledger/edt init`. [If not:] Clone + `npm install && npm run build` or fork the sandbox. npm publish doc at `docs/NPM-PUBLISH.md`.

**"How does the GitHub Action work?"**
> Checkout with `fetch-depth: 0`, run `edt verify --gate`, annotate PR on failure. Extract mode (optional) mines proposed claims from diffs — never auto-merged. Copy from `examples/ledger.yml`.

**"Event ledger sample?"**
> Three live: [Harness Engineering](https://fromcopilottocolleague.com/ledgers/openai-harness-engineering-2025), [The New Code](https://fromcopilottocolleague.com/ledgers/sean-grove-new-code-2025), [Software Factory](https://fromcopilottocolleague.com/ledgers/cursor-software-factory-2025).

**Negative / skeptical — stay technical, no defensiveness:**
> Acknowledge the limitation, link to code, offer to fix. HN rewards mechanism over vision.

---

## T+1h to T+4h (08:30–11:30 PT)

| Time | Action |
|------|--------|
| 08:30 | Notify 2–3 corpus speakers with live ledger links (see `docs/GITHUB-DISCOVER.md`) — personal, not broadcast |
| 09:00 | Star ask to 5 friendly devs (template in `docs/GITHUB-DISCOVER.md`) |
| 10:00 | If rank > #10: stay on HN. If rank drops: still reply to new comments, don't panic-post elsewhere |
| 11:30 | **Do NOT post Product Hunt today** — PH is T+1 (Wednesday) |

---

## T+4h (11:30 PT) — X thread (optional)

Only if HN had traction (>50 points or front page at any point):

| Step | Action |
|------|--------|
| 1 | Post tweet 1 from `docs/X-THREAD.md` with demo GIF |
| 2 | Reply-thread tweets 2–6 over 30 min (not all at once) |
| 3 | Link book homepage CTA + `/ledgers` in final tweet |

**Do not post X thread if HN flopped** — save for Dev.to follow-up instead.

---

## T+1 day — Wednesday Jul 8 — Product Hunt

Checklist from `docs/PRODUCT-HUNT.md`:

- [ ] PH listing live (schedule 00:01 PT Wednesday or morning)
- [ ] Tagline + first comment ready
- [ ] Assets: demo GIF, event ledger screenshot, badge screenshot
- [ ] Maker comment links sandbox fork
- [ ] Respond to every PH comment same day

**Never same day as HN.**

---

## T+2..7 — Follow-ups

| Day | Action |
|-----|--------|
| Jul 9 | Publish Dev.to article (`docs/DEVTO-ARTICLE.md`) — **user posts manually** |
| Jul 9–10 | Awesome-list PRs (`docs/AWESOME-LIST-PR.md`) — one per list |
| Jul 10 | r/programming post (`docs/REDDIT-r-programming.md`) if HN went well |
| Jul 11 | npm publish if org ready (`docs/NPM-PUBLISH.md`) |
| Ongoing | GitHub topics set (`docs/GITHUB-DISCOVER.md`) |

---

## Metrics log (update hourly on launch day)

| Time (PT) | HN points | HN rank | Stars | Sandbox forks | Notes |
|-----------|-----------|---------|-------|---------------|-------|
| 07:30 | | | | | Posted |
| 08:00 | | | | | |
| 09:00 | | | | | |
| 10:00 | | | | | |
| 12:00 | | | | | |
| 17:00 | | | | | EOD snapshot |

**Commands:**

```bash
# Stars (approx — check GitHub UI)
open https://github.com/isatimur/claims-ledger/stargazers

# Sandbox forks
gh api repos/isatimur/claims-ledger-sandbox --jq .forks_count

# CI status
gh run list --repo isatimur/claims-ledger --limit 5

# npm (after publish)
npm view @claims-ledger/edt downloads 2>/dev/null || echo "not published"
```

---

## Abort / damage control

| Situation | Action |
|-----------|--------|
| CI red on launch day | Fix immediately, push, comment on HN with "fixed in SHA" |
| Wrong anchor in event ledger | Fix + comment "thanks, corrected timestamp" — trust win |
| HN flagged / dead | No X thread, no PH bump, focus on Dev.to + awesome lists |
| npm squatting concern | Publish `@claims-ledger/ledger-core` + `edt` same morning before HN comment mentions npx |

---

## User-only clicks remaining (not automatable)

- [ ] HN submit Jul 7 07:30 PT
- [ ] Social preview upload (`docs/SOCIAL-PREVIEW.md`)
- [ ] GitHub Marketplace submit (`docs/MARKETPLACE.md`)
- [ ] npm org create + publish (`docs/NPM-PUBLISH.md`)
- [ ] Product Hunt Jul 8
- [ ] Dev.to publish (post-HN)
- [ ] X thread (optional, T+4h)
- [ ] Speaker DMs (3–5 max, post-HN)

---

## Quick links

| Asset | URL |
|-------|-----|
| Repo | https://github.com/isatimur/claims-ledger |
| Sandbox | https://github.com/isatimur/claims-ledger-sandbox |
| Book homepage | https://fromcopilottocolleague.com |
| Ledgers index | https://fromcopilottocolleague.com/ledgers |
| Demo GIF | https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif |
| Show HN draft | `docs/SHOW-HN.md` |
| HN plain text | `docs/HN-POST-READY.txt` |
