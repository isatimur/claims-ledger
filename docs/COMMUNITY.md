# Community — Q&A and discussions

Enable **GitHub Discussions** on `isatimur/claims-ledger` (Settings → General → Features → Discussions).

Suggested categories:

| Category | Purpose |
|----------|---------|
| **Q&A** | How do I anchor X? Why exit 11? yt:// offline behavior |
| **Show and tell** | Repos using `.ledger/` + badge screenshots |
| **Ideas** | Feature requests before opening an issue |
| **Announcements** | Releases, event ledgers, marketplace listing |

---

## FAQ seeds (pin first Q&A post)

**Why exit 11?**  
Stale anchor — the verbatim quote no longer resolves at the pinned ref. Run `edt reanchor` or update the claim.

**Why are yt:// anchors "unverifiable" offline?**  
Transcript fetch requires network. CI with network can verify; local offline verify reports orange, not green-washed. See [`SUPPORT.md`](../SUPPORT.md).

**Can I use this without OpenRouter?**  
Yes. Verify mode is fully local for git/doc/adr/gh anchors. Extract + judge panel need `OPENROUTER_API_KEY`.

**How is this different from a linter?**  
Linters check syntax. claims-ledger checks that **strong claims still match their sources** — semantic drift, not formatting.

---

## Issue vs discussion

| Use | Channel |
|-----|---------|
| Bug with repro | [Bug report](../.github/ISSUE_TEMPLATE/bug_report.yml) |
| Feature with scope | [Feature request](../.github/ISSUE_TEMPLATE/feature_request.yml) |
| "How do I…?" | Discussions → Q&A |
| "Look at my badge!" | Discussions → Show and tell |

---

## Contributor path

1. Read [`CONTRIBUTING.md`](../CONTRIBUTING.md)
2. Pick [`good-first-issues.md`](good-first-issues.md)
3. Fork [`claims-ledger-sandbox`](https://github.com/isatimur/claims-ledger-sandbox) to try verify locally

---

## Code of conduct

[`CODE_OF_CONDUCT.md`](../.github/CODE_OF_CONDUCT.md) applies to issues, discussions, and PRs.
