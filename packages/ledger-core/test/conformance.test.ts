import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildBookIndex, parseBookLedger, parseLedger } from "../src/index.js";

/**
 * Conformance suite: the TypeScript parser must produce byte-identical JSON to
 * the Python oracle (`build_evidence.py`) for the REAL book ledger — 54 claims,
 * 199 anchors from the 794-video corpus.
 *
 * Fixtures were generated once from the reference implementation:
 *   book-claims-ledger.md      — verbatim copy of `claims/Claims Ledger.md`
 *   book-claims-oracle.json    — parse_ledger() output
 *   book-evidence-oracle.json  — build_index() output (evidence.json)
 */

const FIXTURES = path.join(__dirname, "fixtures");
const ledgerText = fs.readFileSync(path.join(FIXTURES, "book-claims-ledger.md"), "utf-8");
const claimsOracle = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, "book-claims-oracle.json"), "utf-8"),
);
const evidenceOracle = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, "book-evidence-oracle.json"), "utf-8"),
);

describe("parseBookLedger conformance vs build_evidence.py", () => {
  const parsed = parseBookLedger(ledgerText);

  it("parses the expected corpus size (54 claims, 199 anchors)", () => {
    expect(parsed.length).toBe(54);
    expect(parsed.reduce((n, c) => n + c.anchors.length, 0)).toBe(199);
  });

  it("matches the Python oracle exactly (deep equality)", () => {
    expect(parsed).toEqual(claimsOracle);
  });

  it("serializes to identical JSON as the oracle (key order included)", () => {
    // JSON.stringify preserves insertion order; the object shapes must be
    // built in the same field order as the Python dicts for this to hold.
    expect(JSON.stringify(parsed, null, 2)).toBe(JSON.stringify(claimsOracle, null, 2));
  });

  it("buildBookIndex matches evidence.json", () => {
    expect(buildBookIndex(parsed)).toEqual(evidenceOracle);
  });
});

describe("generalized parseLedger on the book ledger", () => {
  it("normalizes every book anchor to yt:// and keeps all 199", () => {
    const claims = parseLedger(ledgerText);
    expect(claims.length).toBe(54);
    const anchors = claims.flatMap((c) => c.anchors);
    // generalized parser keeps quote-less pending anchors too, so >= 199
    expect(anchors.length).toBeGreaterThanOrEqual(199);
    expect(anchors.every((a) => a.scheme === "yt" && a.ref.startsWith("yt://"))).toBe(true);
  });

  it("preserves claim ids, text, and support levels", () => {
    const claims = parseLedger(ledgerText);
    const oracleById = new Map(claimsOracle.map((c: any) => [c.claim_id, c]));
    for (const c of claims) {
      const o = oracleById.get(c.claim_id) as any;
      expect(o).toBeDefined();
      expect(c.text).toBe(o.text);
      expect(c.support_level).toBe(o.support_level);
      expect(c.candidate_scopes).toEqual(o.candidate_chapters.map(String));
    }
  });
});
