import { describe, expect, it } from "vitest";
import { diffLedgers, diffSummary } from "../src/index.js";
import type { Claim } from "../src/index.js";

function claim(id: number, over: Partial<Claim> = {}): Claim {
  return {
    claim_id: `claims#${id}`,
    text: `claim ${id}`,
    support_level: "strong",
    candidate_scopes: [],
    anchors: [
      { scheme: "git", ref: `git://abc1234/src/f${id}.ts#L1-L2`, confidence: "high", quote: "q" },
    ],
    ...over,
  };
}

describe("ledger differ", () => {
  it("detects added, removed, modified, downgraded", () => {
    const base = [claim(1), claim(2), claim(3)];
    const head = [
      claim(1),
      claim(3, { support_level: "tentative" }),
      claim(4),
    ];
    const d = diffLedgers(base, head);
    expect(diffSummary(d)).toEqual({ added: 1, modified: 1, removed: 1, downgraded: 1 });
    expect(d.added[0]!.claim_id).toBe("claims#4");
    expect(d.removed[0]!.claim_id).toBe("claims#2");
    expect(d.downgraded[0]).toEqual({ claim_id: "claims#3", from: "strong", to: "tentative" });
  });

  it("anchor change counts as modified, not downgraded", () => {
    const base = [claim(1)];
    const head = [
      claim(1, {
        anchors: [
          { scheme: "git", ref: "git://def5678/src/f1.ts#L5-L9", confidence: "high", quote: "q" },
        ],
      }),
    ];
    const d = diffLedgers(base, head);
    expect(d.modified.length).toBe(1);
    expect(d.downgraded.length).toBe(0);
  });

  it("upgrade is modified but never downgraded", () => {
    const base = [claim(1, { support_level: "moderate" })];
    const head = [claim(1, { support_level: "strong" })];
    const d = diffLedgers(base, head);
    expect(d.modified.length).toBe(1);
    expect(d.downgraded.length).toBe(0);
  });

  it("identical ledgers produce an empty diff", () => {
    const d = diffLedgers([claim(1)], [claim(1)]);
    expect(diffSummary(d)).toEqual({ added: 0, modified: 0, removed: 0, downgraded: 0 });
  });
});
