import { describe, expect, it } from "vitest";
import { ratio, resolveQuote } from "../src/index.js";

const FILE = `import crypto from "node:crypto";

const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function rotateToken(session: Session) {
  // rotation is best-effort; a worker crash can extend the window
  return schedule(session, ROTATION_INTERVAL_MS);
}
`;

describe("resolver cascade", () => {
  it("resolves an exact quote to its line range", () => {
    const r = resolveQuote("const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000", FILE);
    expect(r).toMatchObject({ method: "exact", startLine: 2, endLine: 2, score: 1 });
  });

  it("resolves a whitespace-rewrapped quote as exact", () => {
    const r = resolveQuote("export function rotateToken(session:    Session) {", FILE);
    expect(r?.method).toBe("exact");
    expect(r?.startLine).toBe(4);
  });

  it("resolves a lightly-reworded quote via fuzzy above threshold", () => {
    const r = resolveQuote(
      "// rotation is best-effort; a worker crash may extend the window",
      FILE,
    );
    expect(r?.method).toBe("fuzzy");
    expect(r!.score).toBeGreaterThanOrEqual(0.87);
    expect(r?.startLine).toBe(5);
  });

  it("returns null for a fabricated quote (anti-fabrication)", () => {
    expect(resolveQuote("tokens are rotated hourly by the gateway", FILE)).toBeNull();
  });

  it("ratio is a normalized similarity", () => {
    expect(ratio("abc", "abc")).toBe(1);
    expect(ratio("abc", "axc")).toBeCloseTo(2 / 3);
    expect(ratio("", "")).toBe(1);
  });
});
