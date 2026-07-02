import { describe, expect, it } from "vitest";
import { formatAnchorRef, headingSlug, parseAnchorRef, schemeOf, toSeconds } from "../src/index.js";

describe("anchor schemes", () => {
  const cases: [string, object][] = [
    [
      "yt://kDEvo2__Ijg 00:00:54.800 → 00:00:57.280",
      { scheme: "yt", videoId: "kDEvo2__Ijg", start: "00:00:54.800", end: "00:00:57.280" },
    ],
    [
      "ts://arch-review-2026-06-12 00:14:02.400 → 00:14:31.200",
      { scheme: "ts", recordingId: "arch-review-2026-06-12", start: "00:14:02.400", end: "00:14:31.200" },
    ],
    [
      "git://4f2a9c1/services/session/rotate.ts#L41-L58",
      { scheme: "git", sha: "4f2a9c1", path: "services/session/rotate.ts", startLine: 41, endLine: 58 },
    ],
    [
      "doc://docs/adr/0007-auth-module-boundaries.md#decision@e91b3d0",
      { scheme: "doc", path: "docs/adr/0007-auth-module-boundaries.md", headingSlug: "decision", sha: "e91b3d0" },
    ],
    ["adr://0007@e91b3d0", { scheme: "adr", id: "0007", sha: "e91b3d0" }],
    [
      "gh://issues/442#comment-19883",
      { scheme: "gh", kind: "issues", number: 442, commentId: "19883" },
    ],
  ];

  it.each(cases)("parses %s", (ref, expected) => {
    expect(parseAnchorRef(ref)).toMatchObject(expected);
  });

  it.each(cases)("round-trips %s through formatAnchorRef", (ref) => {
    const parsed = parseAnchorRef(ref)!;
    expect(formatAnchorRef(parsed)).toBe(ref);
  });

  it("accepts the ASCII arrow variants the book regex accepts", () => {
    expect(parseAnchorRef("yt://kDEvo2__Ijg 00:00:54.800 -> 00:00:57.280")).toMatchObject({
      scheme: "yt",
    });
    expect(parseAnchorRef("yt://kDEvo2__Ijg 00:00:54.800 --> 00:00:57.280")).toMatchObject({
      scheme: "yt",
    });
  });

  it("rejects malformed refs", () => {
    expect(parseAnchorRef("yt://short 00:00:00.000 → 00:00:01.000")).toBeNull();
    expect(parseAnchorRef("git://nothex/services/x.ts#L1-L2")).toBeNull();
    expect(parseAnchorRef("gh://labels/12")).toBeNull();
    expect(parseAnchorRef("plainstring")).toBeNull();
  });

  it("toSeconds truncates like the Python _to_seconds", () => {
    expect(toSeconds("00:14:02.400")).toBe(842);
    expect(toSeconds("01:00:00.999")).toBe(3600);
  });

  it("schemeOf identifies the six schemes", () => {
    for (const s of ["yt", "ts", "git", "doc", "adr", "gh"]) {
      expect(schemeOf(`${s}://x`)).toBe(s);
    }
    expect(schemeOf("http://x")).toBeNull();
  });

  it("headingSlug matches GitHub-style slugs", () => {
    expect(headingSlug("Decision")).toBe("decision");
    expect(headingSlug("Auth Module Boundaries!")).toBe("auth-module-boundaries");
  });
});
