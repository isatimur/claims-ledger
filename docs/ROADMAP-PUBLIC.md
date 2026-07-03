# Public roadmap — v1.1 and beyond

**Current:** v1.0.0 — CLI, GitHub Action, MCP, badge (shields endpoint), event ledger samples, agent skill.

Track progress via [GitHub Issues](https://github.com/isatimur/claims-ledger/issues) · milestone **v1.1** (create on github.com if not present).

---

## v1.1 — targeted (post-launch)

| Feature | Why | Issue seed |
|---------|-----|------------|
| **Embedding resolver** | Faster fuzzy quote match for large monorepos | "Resolver: optional embedding fallback when fuzzy < 0.87" |
| **yt:// verify online** | Transcript anchors gate in CI when `CLAIMS_LEDGER_ONLINE=1` | "Verify mode: optional YouTube caption fetch in Action" |
| **Hosted badge viewer** | `img.claims-ledger.dev/badge/OWNER/REPO` — no raw URL encoding | "Phase 2 badge worker (Cloudflare)" |
| **Marketplace listing live** | `uses: isatimur/claims-ledger@v1` discoverable | Manual — [`MARKETPLACE.md`](MARKETPLACE.md) |
| **npm publish** | `npx @claims-ledger/edt init` zero-install | [`NPM-PUBLISH.md`](NPM-PUBLISH.md) |

---

## v1.2 — community-driven

- VS Code / Cursor extension (ledger sidebar)
- `edt watch` — re-verify on file save
- Org-level ledger merge across repos
- Product Hunt / awesome-list maintenance

---

## Won't do (v1)

- Hosted ledger storage (git is source of truth)
- Auto-rewrite claims without human approval
- Green-washing unverifiable anchors

---

## Star milestone

Create issue **"⭐ v1.1 — embedding resolver + online yt verify"** and pin to milestone v1.1 so HN traffic has a visible "what's next."

Template body:

```markdown
## v1.1 goals

- [ ] Embedding resolver (optional, behind flag)
- [ ] yt:// online verify in GitHub Action
- [ ] Hosted badge MVP (Cloudflare Worker)
- [ ] npm: `@claims-ledger/edt` published

Comment with 👍 on the features you want first.
```
