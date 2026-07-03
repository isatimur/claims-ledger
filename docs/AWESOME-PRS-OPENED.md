# Awesome-list PRs — opened and ready

Wave 4 status (Jul 3, 2026). Full copy-paste pack: [`AWESOME-LIST-PR.md`](AWESOME-LIST-PR.md).

---

## Opened PRs

| List | PR | Status |
|------|-----|--------|
| [sdras/awesome-actions](https://github.com/sdras/awesome-actions) | https://github.com/sdras/awesome-actions/pull/833 | **Opened** Jul 3, 2026 |

> If the PR link is empty, use the fork + diff in the next section — two clicks on GitHub.

---

## Fork URLs (isatimur)

Create branch `add-claims-ledger`, paste the diff, open PR:

| Target repo | Fork |
|-------------|------|
| awesome-github-actions | https://github.com/isatimur/awesome-actions (fork sdras/awesome-actions first if missing) |
| awesome-ai-agents | https://github.com/e2b-dev/awesome-ai-agents → fork to isatimur |
| awesome-devops | https://github.com/WolfgangFahl/awesome-devops → fork to isatimur |

---

## Exact diff — awesome-github-actions (highest priority)

**File:** `README.md` — add under **Code Quality** or **Static Analysis**

```diff
+ - [Auto-Ledger & Verify](https://github.com/isatimur/claims-ledger) - Fail CI when documentation claims go stale. Parses `.ledger/claims.md`, re-resolves verbatim quote anchors, annotates PRs. Demo: https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif · Sandbox: https://github.com/isatimur/claims-ledger-sandbox
```

**PR title:** `Add claims-ledger Action — verify doc claim anchors on every PR`

**PR body:** (from `AWESOME-LIST-PR.md` § awesome-github-actions)

---

## Exact diff — awesome-ai-agents

```diff
+ - [claims-ledger](https://github.com/isatimur/claims-ledger) — Source-anchored claims for agent decisions and docs. Verbatim quote anchors; CI fails (exit 11) when stale. MCP + GitHub Action. Demo GIF: https://github.com/isatimur/claims-ledger/blob/main/demo/demo.gif
```

---

## Submission timing

Per launch plan: submit **T+2..7 after HN** (Jul 9–14), not before Jul 7 Show HN — avoids astroturf optics.

---

## PR checklist (all lists)

- [ ] One line, under 200 chars if list enforces it
- [ ] Link to official repo (not a fork)
- [ ] Demo GIF or sandbox link included
- [ ] No marketing fluff — mechanism first
