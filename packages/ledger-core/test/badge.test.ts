import { describe, expect, it } from "vitest";
import { buildBadge } from "../src/index.js";
import type { VerifyReport } from "../src/index.js";

/** Shields endpoint badge payload (https://shields.io/badges/endpoint-badge). */

function report(partial: Partial<VerifyReport>): VerifyReport {
  return {
    fresh: 0,
    stale: 0,
    unverifiable: 0,
    tentative: 0,
    flaggedSpread: 0,
    results: [],
    exitCode: 0,
    ...partial,
  };
}

describe("buildBadge", () => {
  it("all fresh → brightgreen with the blueprint message format", () => {
    const b = buildBadge(54, report({ fresh: 199 }));
    expect(b).toMatchObject({
      schemaVersion: 1,
      label: "claims",
      message: "54 anchored · 199/199 fresh",
      color: "brightgreen",
    });
  });

  it("stale anchors → red and the stale count is called out", () => {
    const b = buildBadge(54, report({ fresh: 198, stale: 1 }));
    expect(b.message).toBe("54 anchored · 198/199 fresh · 1 stale");
    expect(b.color).toBe("red");
  });

  it("unverifiable-only (offline transcript ledger) → orange, never green-washed", () => {
    const b = buildBadge(54, report({ unverifiable: 199 }));
    expect(b.message).toBe("54 anchored · 199 unverifiable offline");
    expect(b.color).toBe("orange");
  });

  it("empty ledger → lightgrey", () => {
    expect(buildBadge(0, report({}))).toMatchObject({ message: "no claims yet", color: "lightgrey" });
  });
});
