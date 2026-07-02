import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { EXIT, verifyAll, verifyAnchor } from "../src/index.js";
import type { Claim } from "../src/index.js";

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-verify-"));
  fs.mkdirSync(path.join(root, "services/session"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/adr"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "services/session/rotate.ts"),
    [
      "const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
      "export function rotateToken() {",
      "  return ROTATION_INTERVAL_MS;",
      "}",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "docs/adr/0007-auth-module-boundaries.md"),
    ["# 0007 — Auth module boundaries", "", "## Decision", "", "crypto-touching code lives under gateway/auth/ exclusively", ""].join("\n"),
  );
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("verifyAnchor freshness", () => {
  it("git:// anchor with resolving quote is fresh", () => {
    const v = verifyAnchor(
      {
        scheme: "git",
        ref: "git://4f2a9c1/services/session/rotate.ts#L1-L1",
        confidence: "high",
        quote: "const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
      },
      { rootDir: root },
    );
    expect(v.status).toBe("fresh");
    expect(v.resolved).toMatchObject({ startLine: 1, endLine: 1, method: "exact" });
  });

  it("git:// anchor whose quote was removed is stale", () => {
    const v = verifyAnchor(
      {
        scheme: "git",
        ref: "git://4f2a9c1/services/session/rotate.ts#L1-L1",
        confidence: "high",
        quote: "const ROTATION_INTERVAL_MS = 60 * 1000; // hourly",
      },
      { rootDir: root },
    );
    expect(v.status).toBe("stale");
  });

  it("git:// anchor to a missing file is stale", () => {
    const v = verifyAnchor(
      { scheme: "git", ref: "git://4f2a9c1/gateway/verify.ts#L12-L30", confidence: "high", quote: "x" },
      { rootDir: root },
    );
    expect(v.status).toBe("stale");
    expect(v.detail).toContain("file not found");
  });

  it("doc:// anchor with live heading + quote is fresh; renamed heading is stale", () => {
    const fresh = verifyAnchor(
      {
        scheme: "doc",
        ref: "doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0",
        confidence: "high",
        quote: "crypto-touching code lives under gateway/auth/ exclusively",
      },
      { rootDir: root },
    );
    expect(fresh.status).toBe("fresh");

    const stale = verifyAnchor(
      {
        scheme: "doc",
        ref: "doc://docs/adr/0007-auth-module-boundaries.md#outcome@e91b3d0",
        confidence: "high",
      },
      { rootDir: root },
    );
    expect(stale.status).toBe("stale");
    expect(stale.detail).toContain("heading");
  });

  it("adr:// resolves by id prefix", () => {
    expect(verifyAnchor({ scheme: "adr", ref: "adr://0007@e91b3d0", confidence: "high" }, { rootDir: root }).status).toBe("fresh");
    expect(verifyAnchor({ scheme: "adr", ref: "adr://0099", confidence: "high" }, { rootDir: root }).status).toBe("stale");
  });

  it("gh:// and yt:// without local data are unverifiable (never gate)", () => {
    expect(
      verifyAnchor({ scheme: "gh", ref: "gh://issues/442#comment-19883", confidence: "medium" }, { rootDir: root })
        .status,
    ).toBe("unverifiable");
    expect(
      verifyAnchor(
        { scheme: "yt", ref: "yt://kDEvo2__Ijg 00:00:54.800 → 00:00:57.280", confidence: "high" },
        { rootDir: root },
      ).status,
    ).toBe("unverifiable");
  });
});

describe("verifyAll gate exit codes", () => {
  const freshClaim: Claim = {
    claim_id: "claims#1",
    text: "Rotation interval is 24h",
    support_level: "strong",
    candidate_scopes: ["session"],
    anchors: [
      {
        scheme: "git",
        ref: "git://4f2a9c1/services/session/rotate.ts#L1-L1",
        confidence: "high",
        quote: "const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
      },
    ],
  };

  it("all fresh ⇒ exit 0", () => {
    const r = verifyAll({ claims: [freshClaim] }, { rootDir: root });
    expect(r.exitCode).toBe(EXIT.OK);
  });

  it("tentative claim ⇒ exit 10", () => {
    const r = verifyAll(
      { claims: [freshClaim, { ...freshClaim, claim_id: "claims#2", support_level: "tentative" }] },
      { rootDir: root },
    );
    expect(r.exitCode).toBe(EXIT.TENTATIVE);
  });

  it("stale anchor ⇒ exit 11 and takes precedence over tentative", () => {
    const staleClaim: Claim = {
      ...freshClaim,
      claim_id: "claims#3",
      anchors: [{ scheme: "git", ref: "git://a11c04d/gateway/verify.ts#L12-L30", confidence: "high", quote: "x" }],
    };
    const r = verifyAll(
      { claims: [staleClaim, { ...freshClaim, claim_id: "claims#4", support_level: "tentative" }] },
      { rootDir: root },
    );
    expect(r.exitCode).toBe(EXIT.STALE_ANCHOR);
  });

  it("panel spread flag ⇒ exit 12", () => {
    const r = verifyAll(
      {
        decisions: [
          {
            decision_id: "edt#1",
            text: "d",
            kind: "refactor",
            support_level: "strong",
            anchors: [freshClaim.anchors[0]!],
            panel: { scores: [60, 95, 88], median: 88, spread: 35, flagged: true },
          },
        ],
      },
      { rootDir: root },
    );
    expect(r.exitCode).toBe(EXIT.PANEL_SPREAD);
  });

  it("--only-touched skips anchors outside the touched paths", () => {
    const r = verifyAll(
      {
        claims: [
          {
            ...freshClaim,
            anchors: [{ scheme: "git", ref: "git://a11c04d/gateway/verify.ts#L12-L30", confidence: "high", quote: "x" }],
          },
        ],
      },
      { rootDir: root, onlyPaths: ["services/"] },
    );
    expect(r.results.length).toBe(0);
    expect(r.exitCode).toBe(EXIT.OK);
  });
});
