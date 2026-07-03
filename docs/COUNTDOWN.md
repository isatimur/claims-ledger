# Launch countdown — Show HN Jul 7, 2026

**Today:** Jul 3, 2026 · **Launch:** Mon Jul 7, 2026 (Show HN) · **Days left:** 4

---

## Status board

| Item | Owner | Status |
|------|-------|--------|
| npm `@claims-ledger/edt` published | User | ⏳ CI workflow ready — add `NPM_TOKEN`, run workflow |
| GitHub Discussions enabled | Auto | ✅ Jul 3 |
| 5 event ledgers live | Auto | ✅ + Barry Zhang ledger |
| awesome-actions PR #833 | Open | ✅ awaiting merge |
| awesome-ai-agents PR #2 | Auto | ✅ opened Wave 5 |
| Marketplace form ready | User | ✅ [`MARKETPLACE-SUBMIT-FORM.md`](MARKETPLACE-SUBMIT-FORM.md) |
| Social preview image | User | ⏳ upload `docs/social-preview.png` |
| HN post draft | Ready | [`SHOW-HN.md`](SHOW-HN.md) — do not post until Jul 7 |

---

## Jul 4 (Fri) — npm + marketplace prep

- [ ] Create npm org `@claims-ledger` at https://www.npmjs.com/org/create
- [ ] Generate npm **Automation** token → add repo secret `NPM_TOKEN`
- [ ] Run **Actions → npm-publish → Run workflow** (or `./scripts/npm-publish.sh` after `npm login`)
- [ ] Verify: `npx @claims-ledger/edt --help`
- [ ] Upload social preview (Settings → General)
- [ ] Fill Marketplace form from [`MARKETPLACE-SUBMIT-FORM.md`](MARKETPLACE-SUBMIT-FORM.md) — save draft, don't submit until CI green post-npm

**Micro-task (15 min):** Pin one ledger URL in Discussions welcome post.

---

## Jul 5 (Sat) — polish + dry run

- [ ] Re-read [`SHOW-HN.md`](SHOW-HN.md) and [`LAUNCH-DAY-RUNBOOK.md`](LAUNCH-DAY-RUNBOOK.md)
- [ ] Run `./demo/scenario.sh` — confirm GIF still matches behavior
- [ ] Check awesome-actions PR #833 — nudge if no response (don't spam)
- [ ] Bookmark HN submit: https://news.ycombinator.com/submit
- [ ] Test sandbox fork flow: https://github.com/isatimur/claims-ledger-sandbox/fork

**Micro-task (10 min):** Star your own repo + book lab (social proof baseline).

---

## Jul 6 (Sun) — eve of launch

- [ ] Confirm npm publish live (badge on README should resolve)
- [ ] Confirm all 5 ledgers load: https://fromcopilottocolleague.com/ledgers
- [ ] Pre-write HN comment replies (npm install, sandbox link, book graph link)
- [ ] Queue Product Hunt for Jul 8+ (not same day as HN) — [`PRODUCT-HUNT-SHIP.md`](PRODUCT-HUNT-SHIP.md)
- [ ] Sleep — launch window is US morning Jul 7

**Micro-task (5 min):** Set phone alarm for 8:00 AM ET Jul 7.

---

## Jul 7 (Mon) — Show HN day

Follow [`LAUNCH-DAY-RUNBOOK.md`](LAUNCH-DAY-RUNBOOK.md). Do **not** post PH/X/reddit same hour.

- [ ] Post Show HN (title + URL from `SHOW-HN.md`)
- [ ] Monitor Discussions + Issues for first-hour questions
- [ ] Reply to HN comments within 30 min (first 2 hours critical)
- [ ] Submit Marketplace listing if not done Jul 4–6

---

## Post-launch (Jul 8–14)

- [ ] awesome-ai-agents PR merge follow-up
- [ ] Dev.to article [`DEVTO-ARTICLE.md`](DEVTO-ARTICLE.md) — T+1
- [ ] Second awesome list (devops) if first two merged — [`AWESOME-PRS-OPENED.md`](AWESOME-PRS-OPENED.md)

---

## Quick links

| Resource | URL |
|----------|-----|
| Book | https://fromcopilottocolleague.com |
| Ledgers | https://fromcopilottocolleague.com/ledgers |
| Evidence graph | https://fromcopilottocolleague.com/read/graph |
| Repo | https://github.com/isatimur/claims-ledger |
| Sandbox | https://github.com/isatimur/claims-ledger-sandbox |
| Discussions | https://github.com/isatimur/claims-ledger/discussions |
