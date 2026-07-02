import { describe, expect, it } from "vitest";
import {
  DISAGREEMENT_THRESHOLD,
  labelFor,
  median,
  mergePanelScores,
  NullJudgePanel,
  StaticJudgePanel,
  supportFromPanel,
} from "../src/index.js";

describe("panel merge (ported from panel_merge.py)", () => {
  it("takes the median of three scores", () => {
    const p = mergePanelScores([86, 90, 84])!;
    expect(p.median).toBe(86);
    expect(p.spread).toBe(6);
    expect(p.flagged).toBe(false);
  });

  it("flags spread > 20 instead of averaging it away", () => {
    const p = mergePanelScores([60, 95, 88])!;
    expect(p.median).toBe(88);
    expect(p.spread).toBe(35);
    expect(p.spread).toBeGreaterThan(DISAGREEMENT_THRESHOLD);
    expect(p.flagged).toBe(true);
  });

  it("exactly 20 spread is NOT flagged (strict >, per panel_merge.py)", () => {
    expect(mergePanelScores([70, 90, 80])!.flagged).toBe(false);
  });

  it("requires MIN_PANEL_VOTES valid scores", () => {
    expect(mergePanelScores([88, null, null])).toBeNull();
    expect(mergePanelScores([null, null, null])).toBeNull();
    expect(mergePanelScores([88, 84, null])).not.toBeNull();
  });

  it("even-count median averages the middle pair", () => {
    expect(median([80, 90])).toBe(85);
  });

  it("labelFor matches the book-mash 4-band rubric", () => {
    expect(labelFor(80)).toBe("strong");
    expect(labelFor(79.9)).toBe("moderate");
    expect(labelFor(50)).toBe("moderate");
    expect(labelFor(20)).toBe("weak");
    expect(labelFor(19)).toBe("fail");
    expect(labelFor(null)).toBe("error");
  });

  it("supportFromPanel maps medians to ledger support levels", () => {
    expect(supportFromPanel(mergePanelScores([86, 90, 84]))).toBe("strong");
    expect(supportFromPanel(mergePanelScores([55, 60, 52]))).toBe("moderate");
    expect(supportFromPanel(mergePanelScores([10, 30, 20]))).toBe("tentative");
    expect(supportFromPanel(null)).toBe("tentative");
  });

  it("NullJudgePanel refuses to score (flag-don't-fabricate)", async () => {
    const scores = await new NullJudgePanel().score();
    expect(scores).toEqual([null, null, null]);
    expect(mergePanelScores(scores)).toBeNull();
  });

  it("StaticJudgePanel returns deterministic scores for tests", async () => {
    const panel = new StaticJudgePanel({ "claim A": [86, 90, 84] });
    expect(await panel.score({ text: "claim A", evidence: [], dimension: "claim_defensibility" })).toEqual([
      86, 90, 84,
    ]);
  });
});
