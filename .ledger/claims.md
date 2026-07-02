# Claims Ledger

> Every claim below carries a machine-verifiable anchor. `edt verify --gate`
> fails CI when an anchor goes stale. No anchor, no strong claim.
>
> This is the tool's own ledger — self-hosting per the launch checklist.

## 1) The ledger parser is a byte-compatible port of the book's build_evidence.py grammar
- **Support level:** strong
- **Scopes:** ledger-core, parser
- **Source:** parser.ts module doc
  - **Anchor:** `git://58343a1/packages/ledger-core/src/parser.ts#L7-L7` · confidence: high
    - **Quote:** "a mechanical, byte-compatible port of"
- **Caveats:** Conformance is enforced against fixtures generated from the real 54-claim book ledger, not against live Python at test time.

## 2) A stale anchor gates CI with exit code 11
- **Support level:** strong
- **Scopes:** edt, verify
- **Source:** gate exit code table
  - **Anchor:** `git://58343a1/packages/ledger-core/src/types.ts#L111-L111` · confidence: high
    - **Quote:** "STALE_ANCHOR: 11,"
- **Caveats:** Exit codes are API — see CONTRIBUTING.md rule 3.

## 3) Anchors cannot be fabricated: the verbatim quote must resolve at the ref
- **Support level:** strong
- **Scopes:** ledger-core, resolver
- **Source:** resolver anti-fabrication note
  - **Anchor:** `git://58343a1/packages/ledger-core/src/resolver.ts#L22-L22` · confidence: high
    - **Quote:** "An LLM can hallucinate a justification; it cannot hallucinate a string into"

## 4) Judge-panel disagreement above 20 points flags the decision instead of averaging it away
- **Support level:** strong
- **Scopes:** ledger-core, panel
- **Source:** panel merge constants
  - **Anchor:** `git://58343a1/packages/ledger-core/src/panel.ts#L13-L13` · confidence: high
    - **Quote:** "export const DISAGREEMENT_THRESHOLD = 20;"

## 5) First value is one command: edt init scaffolds the ledger workspace
- **Support level:** strong
- **Scopes:** edt, onboarding
- **Source:** README quickstart
  - **Anchor:** `doc://README.md#quickstart@58343a1` · confidence: high
    - **Quote:** "npx @claims-ledger/edt init"
