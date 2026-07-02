import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { EXIT, StaticJudgePanel } from "@claims-ledger/ledger-core";
import {
  cmdExport,
  cmdInit,
  cmdReanchor,
  cmdRender,
  cmdTraceAddDecision,
  cmdTraceNew,
  cmdTraceScore,
  cmdVerify,
  type Io,
} from "../src/commands.js";

/** End-to-end lifecycle on a real temp git repo (blueprint §4 acceptance path):
 *  init → claim with git:// anchor → verify --gate exits 0 → break anchor →
 *  exits 11 → reanchor → exits 0 again. */

let root: string;
let lines: string[];
const io: Io = {
  out: (l) => lines.push(l),
  err: (l) => lines.push(l),
};

function sh(cmd: string, args: string[]) {
  execFileSync(cmd, args, { cwd: root, stdio: "ignore" });
}

beforeEach(() => {
  lines = [];
  root = fs.mkdtempSync(path.join(os.tmpdir(), "edt-e2e-"));
  sh("git", ["init", "-q"]);
  sh("git", ["config", "user.email", "test@test"]);
  sh("git", ["config", "user.name", "test"]);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "src/session.ts"),
    ["export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;", "export function rotate() {}", ""].join("\n"),
  );
  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-qm", "init"]);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function writeClaim() {
  const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  fs.appendFileSync(
    path.join(root, ".ledger/claims.md"),
    [
      "",
      "## 1) Session tokens rotate every 24 hours",
      "- **Support level:** strong",
      "- **Scopes:** session",
      `  - **Anchor:** \`git://${sha}/src/session.ts#L1-L1\` · confidence: high`,
      '    - **Quote:** "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;"',
      "",
    ].join("\n"),
  );
}

describe("edt end-to-end", () => {
  it("init scaffolds .ledger and the pre-commit hook", () => {
    expect(cmdInit(root, io)).toBe(EXIT.OK);
    expect(fs.existsSync(path.join(root, ".ledger/claims.md"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".ledger/traces"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".git/hooks/pre-commit"))).toBe(true);
  });

  it("verify --gate: 0 when fresh, 11 when the anchor breaks, 0 after reanchor", () => {
    cmdInit(root, io);
    writeClaim();

    expect(cmdVerify(root, io, { gate: true })).toBe(EXIT.OK);

    // break the anchor: reword the anchored line beyond the fuzzy threshold
    fs.writeFileSync(
      path.join(root, "src/session.ts"),
      ["// completely different file now", "export function nothing() {}", ""].join("\n"),
    );
    expect(cmdVerify(root, io, { gate: true })).toBe(EXIT.STALE_ANCHOR);

    // move the quoted line to another file — reanchor should follow it
    fs.writeFileSync(
      path.join(root, "src/rotation.ts"),
      ["export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;", ""].join("\n"),
    );
    sh("git", ["add", "-A"]);
    // bypass the edt pre-commit hook installed by cmdInit — the test env has no edt on PATH
    sh("git", ["commit", "-qm", "move rotation constant", "--no-verify"]);

    expect(cmdReanchor(root, io, "claims#1")).toBe(EXIT.OK);
    expect(fs.readFileSync(path.join(root, ".ledger/claims.md"), "utf-8")).toContain("src/rotation.ts#L1-L1");
    expect(cmdVerify(root, io, { gate: true })).toBe(EXIT.OK);
  });

  it("trace lifecycle: new → add-decision (anti-fabrication) → score → render → export", async () => {
    cmdInit(root, io);
    expect(cmdTraceNew(root, io, { pr: 481 })).toBe(EXIT.OK);

    // fabricated quote is rejected
    expect(
      cmdTraceAddDecision(root, io, {
        text: "Rotation is hourly",
        kind: "behavior",
        anchors: ["git://abc1234/src/session.ts#L1-L1"],
        quotes: ["export const ROTATION_INTERVAL_MS = 60 * 1000;"],
        confidence: "high",
      }),
    ).toBe(1);
    expect(lines.join("\n")).toContain("quote does not resolve");

    // real quote is accepted and support is anchor-derived strong
    expect(
      cmdTraceAddDecision(root, io, {
        text: "Kept 24h rotation interval per session design",
        kind: "config",
        anchors: ["git://abc1234/src/session.ts#L1-L1"],
        quotes: ["export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;"],
        confidence: "high",
      }),
    ).toBe(EXIT.OK);

    const tracePath = path.join(root, ".ledger/traces/pr-481.trace.json");
    const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
    expect(trace.decisions.length).toBe(1);
    expect(trace.decisions[0].support_level).toBe("strong");
    expect(trace.summary).toMatchObject({ decisions: 1, strong: 1 });

    // deterministic panel: median 88, spread 6 — not flagged
    const panel = new StaticJudgePanel({ "Kept 24h rotation interval per session design": [86, 91, 88] });
    expect(await cmdTraceScore(root, io, panel, { trace: tracePath })).toBe(EXIT.OK);
    const scored = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
    expect(scored.decisions[0].panel).toMatchObject({ median: 88, spread: 5, flagged: false });

    // render pr-body
    lines = [];
    expect(cmdRender(root, io, { format: "pr-body", trace: tracePath })).toBe(EXIT.OK);
    const body = lines.join("\n");
    expect(body).toContain("```edt-trace v1");
    expect(body).toContain("- edt#1 [strong] config: Kept 24h rotation interval");

    // export merges the accepted decision into ledger.json
    expect(cmdExport(root, io, { format: "ledger-json", trace: tracePath })).toBe(EXIT.OK);
    const ledger = JSON.parse(fs.readFileSync(path.join(root, ".ledger/ledger.json"), "utf-8"));
    expect(ledger.length).toBe(1);
    expect(ledger[0].claim_id).toBe("claims#1");
    expect(ledger[0].provenance.pr).toBe(481);
  });

  it("panel spread > 20 flags the decision and gates with exit 12", async () => {
    cmdInit(root, io);
    cmdTraceNew(root, io, { pr: 9 });
    cmdTraceAddDecision(root, io, {
      text: "Contested decision",
      kind: "behavior",
      anchors: ["gh://issues/1#comment-1"],
      quotes: [],
      confidence: "medium",
    });
    const tracePath = path.join(root, ".ledger/traces/pr-9.trace.json");
    const panel = new StaticJudgePanel({ "Contested decision": [60, 95, 88] });
    expect(await cmdTraceScore(root, io, panel, { trace: tracePath })).toBe(EXIT.PANEL_SPREAD);
    expect(cmdVerify(root, io, { gate: true, trace: tracePath })).toBe(EXIT.PANEL_SPREAD);
  });

  it("scoring without an API key is skipped, not fabricated", async () => {
    cmdInit(root, io);
    cmdTraceNew(root, io, { pr: 10 });
    cmdTraceAddDecision(root, io, {
      text: "Some decision",
      kind: "refactor",
      anchors: ["gh://issues/2"],
      quotes: [],
      confidence: "medium",
    });
    const tracePath = path.join(root, ".ledger/traces/pr-10.trace.json");
    const { NullJudgePanel } = await import("@claims-ledger/ledger-core");
    lines = [];
    expect(await cmdTraceScore(root, io, new NullJudgePanel(), { trace: tracePath })).toBe(EXIT.OK);
    expect(lines.join("\n")).toContain("scoring skipped");
  });

  it("verify --require-trace gates 13 when no trace exists", () => {
    cmdInit(root, io);
    expect(cmdVerify(root, io, { gate: true, requireTrace: true })).toBe(EXIT.TRACE_MISSING);
  });
});
