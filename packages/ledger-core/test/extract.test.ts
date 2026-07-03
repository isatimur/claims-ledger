import { describe, expect, it } from "vitest";
import {
  anchorDraft,
  extractClaims,
  extractPrompt,
  parseDraftsReply,
  renderProposedClaims,
  parseLedger,
} from "../src/index.js";

/** Extract-mode pipeline: LLM proposes drafts, the resolver anchors or rejects
 *  them (anti-fabrication). All LLM calls are injected — no key required. */

const DOC = [
  "# Session design",
  "",
  "Auth tokens are rotated every 24 hours by the session worker.",
  "A worker crash can extend the rotation window (best-effort).",
  "",
].join("\n");

const SOURCE = { path: "docs/session.md", content: DOC };

describe("extractPrompt", () => {
  it("carries the file path, excerpt, verbatim-quote rule, and existing claims", () => {
    const p = extractPrompt(SOURCE, ["Old claim about auth"]);
    expect(p).toContain("File: docs/session.md");
    expect(p).toContain("Auth tokens are rotated every 24 hours");
    expect(p).toContain("VERBATIM substring");
    expect(p).toContain("- Old claim about auth");
  });
});

describe("parseDraftsReply", () => {
  it("parses strict JSON-mode output", () => {
    const drafts = parseDraftsReply('{"claims": [{"text": "T", "quote": "Q", "scopes": ["auth"]}]}');
    expect(drafts).toEqual([{ text: "T", quote: "Q", scopes: ["auth"] }]);
  });
  it("parses fenced-json fallback", () => {
    const drafts = parseDraftsReply('Here you go:\n```json\n{"claims": [{"text": "T", "quote": "Q"}]}\n```');
    expect(drafts).toEqual([{ text: "T", quote: "Q" }]);
  });
  it("drops malformed entries and rejects non-JSON", () => {
    expect(parseDraftsReply('{"claims": [{"text": "no quote"}, {"text": "ok", "quote": "q"}]}')).toEqual([
      { text: "ok", quote: "q" },
    ]);
    expect(parseDraftsReply("I refuse")).toBeNull();
  });
});

describe("anchorDraft — the anti-fabrication gate", () => {
  it("anchors a draft whose quote resolves, as tentative with high confidence", () => {
    const claim = anchorDraft(
      { text: "Tokens rotate daily", quote: "rotated every 24 hours by the session worker" },
      { path: "docs/session.md", content: DOC, sha: "abc1234" },
      "claims#7",
      "test/0.0.0",
    )!;
    expect(claim.support_level).toBe("tentative");
    expect(claim.anchors[0]!.ref).toBe("git://abc1234/docs/session.md#L3-L3");
    expect(claim.anchors[0]!.confidence).toBe("high");
    expect(claim.provenance!.extracted_by).toBe("test/0.0.0");
  });

  it("rejects a fabricated quote outright", () => {
    expect(
      anchorDraft(
        { text: "Tokens rotate hourly", quote: "rotated every hour by the gateway" },
        { path: "docs/session.md", content: DOC, sha: "abc1234" },
        "claims#8",
        "test/0.0.0",
      ),
    ).toBeNull();
  });
});

describe("extractClaims pipeline", () => {
  it("accepts resolving drafts, rejects fabricated ones, surfaces model errors", async () => {
    const replies: Record<string, string | null> = {
      "docs/session.md": JSON.stringify({
        claims: [
          { text: "Tokens rotate every 24h", quote: "rotated every 24 hours by the session worker" },
          { text: "Fabricated", quote: "this string is not in the file" },
        ],
      }),
      "docs/broken.md": null,
    };
    const result = await extractClaims(
      [SOURCE, { path: "docs/broken.md", content: "whatever" }],
      async (prompt) => {
        const m = /File: (\S+)/.exec(prompt)!;
        return replies[m[1]!] ?? null;
      },
      { sha: "abc1234", extractedBy: "test/0.0.0", nextId: 3 },
    );
    expect(result.accepted.map((c) => c.claim_id)).toEqual(["claims#3"]);
    expect(result.rejected.length).toBe(1);
    expect(result.errors).toEqual(["docs/broken.md: model call failed"]);
  });

  it("renders proposals in the ledger grammar the parser round-trips", async () => {
    const result = await extractClaims(
      [SOURCE],
      async () =>
        JSON.stringify({
          claims: [{ text: "Rotation is best-effort", quote: "A worker crash can extend the rotation window", scopes: ["session"] }],
        }),
      { sha: "abc1234", extractedBy: "test/0.0.0" },
    );
    const md = renderProposedClaims(result.accepted, 0);
    const parsed = parseLedger(md);
    expect(parsed.length).toBe(1);
    expect(parsed[0]!.text).toBe("Rotation is best-effort");
    expect(parsed[0]!.support_level).toBe("tentative");
    expect(parsed[0]!.anchors[0]!.quote).toBe("A worker crash can extend the rotation window");
  });
});
