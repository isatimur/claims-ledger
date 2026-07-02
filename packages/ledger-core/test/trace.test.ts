import { describe, expect, it } from "vitest";
import {
  newTrace,
  nextDecisionId,
  parsePrBody,
  recomputeSummary,
  renderPrBody,
  supportFromAnchors,
} from "../src/index.js";
import type { Decision, Trace } from "../src/index.js";

const DECISION: Decision = {
  decision_id: "edt#1",
  text: "Moved JWT verification into gateway/auth/ to isolate crypto deps",
  kind: "refactor",
  support_level: "strong",
  anchors: [
    {
      scheme: "doc",
      ref: "doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0",
      confidence: "high",
      quote: "crypto-touching code lives under gateway/auth/ exclusively",
    },
    {
      scheme: "git",
      ref: "git://c3d9a72/gateway/verify.ts#L1-L8",
      confidence: "high",
      quote: "// TODO(priya): this file should not import node:crypto directly",
    },
  ],
};

describe("trace-v1", () => {
  it("newTrace builds blueprint-shaped trace ids", () => {
    const t = newTrace({ branch: "feat/auth-module-boundary", pr: 481, date: new Date("2026-07-02T12:00:00Z") });
    expect(t.trace_id).toBe("edt-2026-07-02-481");
    expect(t.$schema).toBe("https://claims-ledger.dev/schemas/trace-v1.json");
    expect(nextDecisionId(t)).toBe("edt#1");
  });

  it("recomputeSummary counts support levels", () => {
    const t: Trace = {
      ...newTrace({ branch: "b" }),
      decisions: [DECISION, { ...DECISION, decision_id: "edt#2", support_level: "moderate" }],
    };
    expect(recomputeSummary(t)).toEqual({
      decisions: 2,
      strong: 1,
      moderate: 1,
      tentative: 0,
      stale_anchors: 0,
    });
  });

  it("supportFromAnchors: no anchors ⇒ tentative; high-confidence quoted ⇒ strong", () => {
    expect(supportFromAnchors({ anchors: [] })).toBe("tentative");
    expect(supportFromAnchors(DECISION)).toBe("strong");
    expect(
      supportFromAnchors({
        anchors: [{ scheme: "gh", ref: "gh://issues/442#comment-19883", confidence: "medium", quote: "q" }],
      }),
    ).toBe("moderate");
  });

  it("renderPrBody emits the blueprint §2.4 fenced block and parsePrBody round-trips it", () => {
    const t: Trace = { ...newTrace({ branch: "b", pr: 481, date: new Date("2026-07-02T12:00:00Z") }), decisions: [DECISION] };
    const body = renderPrBody(t);
    expect(body).toContain("```edt-trace v1");
    expect(body).toContain("- edt#1 [strong] refactor: Moved JWT verification into gateway/auth/");
    expect(body).toContain('⚓ doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0 "crypto-touching code lives under gateway/auth/ exclusively"');

    const parsed = parsePrBody(`Some PR prose\n\n${body}\n\nmore prose`);
    expect(parsed?.trace_id).toBe("edt-2026-07-02-481");
    expect(parsed?.decisions.length).toBe(1);
    expect(parsed?.decisions[0]!.anchors.map((a) => a.ref)).toEqual(DECISION.anchors.map((a) => a.ref));
    expect(parsed?.decisions[0]!.anchors[0]!.quote).toBe(DECISION.anchors[0]!.quote);
  });

  it("parsePrBody handles yt:// timestamp anchors with spaces in the ref", () => {
    const body = [
      "```edt-trace v1",
      "trace: edt-2026-07-02-9",
      "- edt#1 [moderate] behavior: Cited talk evidence",
      '  ⚓ yt://kDEvo2__Ijg 00:00:54.800 → 00:00:57.280 "from helpfulness to productive"',
      "```",
    ].join("\n");
    const parsed = parsePrBody(body)!;
    expect(parsed.decisions[0]!.anchors[0]!.ref).toBe("yt://kDEvo2__Ijg 00:00:54.800 → 00:00:57.280");
    expect(parsed.decisions[0]!.anchors[0]!.quote).toBe("from helpfulness to productive");
  });
});
