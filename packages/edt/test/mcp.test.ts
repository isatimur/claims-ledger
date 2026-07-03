import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { StaticJudgePanel } from "@claims-ledger/ledger-core";
import { cmdInit, cmdTraceNew } from "../src/commands.js";
import {
  buildMcpServer,
  handleAnchorVerify,
  handleLedgerClaims,
  handleLedgerSearch,
  handleTraceAddDecision,
  handleTraceScore,
} from "../src/mcp.js";

/** MCP tool handlers (blueprint §2.3) exercised directly — no stdio transport,
 *  no OPENROUTER_API_KEY. */

let root: string;
const io = { out: () => {}, err: () => {} };

function sh(args: string[]) {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "edt-mcp-"));
  sh(["init", "-q"]);
  sh(["config", "user.email", "t@t"]);
  sh(["config", "user.name", "t"]);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(
    path.join(root, "src/session.ts"),
    "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;\n",
  );
  sh(["add", "-A"]);
  sh(["commit", "-qm", "init", "--no-verify"]);
  cmdInit(root, io);
  fs.appendFileSync(
    path.join(root, ".ledger/claims.md"),
    [
      "",
      "## 1) Session tokens rotate every 24 hours",
      "- **Support level:** strong",
      "- **Scopes:** session, auth",
      "  - **Anchor:** `git://abc1234/src/session.ts#L1-L1` · confidence: high",
      '    - **Quote:** "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;"',
      "",
      "## 2) The gateway never touches crypto directly",
      "- **Support level:** moderate",
      "- **Scopes:** gateway",
      "  - **Anchor:** `gh://issues/7#comment-1` · confidence: medium",
      "",
    ].join("\n"),
  );
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("ledger_search", () => {
  it("ranks claims by keyword overlap across text, scopes, and quotes", () => {
    const r = handleLedgerSearch(root, { query: "session rotation tokens" });
    const data = JSON.parse(r.text);
    expect(r.isError).toBeUndefined();
    expect(data.results[0].id).toBe("claims#1");
    expect(data.results[0].anchors[0].quote).toContain("ROTATION_INTERVAL_MS");
  });

  it("searches open-trace decisions too", () => {
    cmdTraceNew(root, io, { pr: 1 });
    handleTraceAddDecision(root, {
      text: "Kept the 24h rotation window",
      kind: "config",
      anchors: [
        {
          ref: "git://abc1234/src/session.ts#L1-L1",
          quote: "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
          confidence: "high",
        },
      ],
    });
    const r = handleLedgerSearch(root, { query: "rotation window", k: 10 });
    const data = JSON.parse(r.text);
    expect(data.results.some((x: { kind: string }) => x.kind === "decision")).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(handleLedgerSearch(root, { query: "   " }).isError).toBe(true);
  });
});

describe("trace_add_decision — anti-fabrication over MCP", () => {
  beforeEach(() => cmdTraceNew(root, io, { pr: 2 }));

  it("accepts a decision whose quote resolves", () => {
    const r = handleTraceAddDecision(root, {
      text: "Rotation interval stays at 24h",
      kind: "config",
      anchors: [
        {
          ref: "git://abc1234/src/session.ts#L1-L1",
          quote: "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
          confidence: "high",
        },
      ],
    });
    expect(r.isError).toBeUndefined();
    expect(r.text).toContain("edt#1 [strong]");
  });

  it("rejects a fabricated quote with a tool error", () => {
    const r = handleTraceAddDecision(root, {
      text: "Rotation is hourly",
      anchors: [
        { ref: "git://abc1234/src/session.ts#L1-L1", quote: "ROTATION_INTERVAL_MS = 60 * 1000" },
      ],
    });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("quote does not resolve");
  });

  it("errors when no trace is open", () => {
    fs.rmSync(path.join(root, ".ledger/traces"), { recursive: true, force: true });
    const r = handleTraceAddDecision(root, {
      text: "x",
      anchors: [{ ref: "gh://issues/1" }],
    });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("no trace open");
  });
});

describe("trace_score", () => {
  it("scores via an injected panel and reports spread flags", async () => {
    cmdTraceNew(root, io, { pr: 3 });
    handleTraceAddDecision(root, {
      text: "Contested decision",
      anchors: [{ ref: "gh://issues/9" }],
    });
    const panel = new StaticJudgePanel({ "Contested decision": [60, 95, 88] });
    const r = await handleTraceScore(root, panel);
    expect(r.isError).toBeUndefined();
    expect(r.text).toContain("median 88");
    expect(r.text).toContain("panel spread > 20");
  });

  it("without a key the NullJudgePanel skips, never fabricates", async () => {
    cmdTraceNew(root, io, { pr: 4 });
    handleTraceAddDecision(root, { text: "Some decision", anchors: [{ ref: "gh://issues/2" }] });
    const r = await handleTraceScore(root); // panelFromEnv → NullJudgePanel in test env
    expect(r.isError).toBeUndefined();
    expect(r.text).toContain("scoring skipped");
  });
});

describe("anchor_verify", () => {
  it("fresh when the quote resolves", () => {
    const r = handleAnchorVerify(root, {
      ref: "git://abc1234/src/session.ts#L1-L1",
      quote: "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;",
    });
    expect(JSON.parse(r.text).status).toBe("fresh");
  });

  it("stale when the quote does not resolve; malformed refs error", () => {
    const r = handleAnchorVerify(root, {
      ref: "git://abc1234/src/session.ts#L1-L1",
      quote: "not in the file at all, definitely not",
    });
    expect(JSON.parse(r.text).status).toBe("stale");
    expect(handleAnchorVerify(root, { ref: "nonsense://x" }).isError).toBe(true);
  });
});

describe("ledger_claims", () => {
  it("lists all claims, filtered by scope", () => {
    const all = JSON.parse(handleLedgerClaims(root, {}).text);
    expect(all.count).toBe(2);
    const gw = JSON.parse(handleLedgerClaims(root, { scope: "gateway" }).text);
    expect(gw.count).toBe(1);
    expect(gw.claims[0].id).toBe("claims#2");
    const byPath = JSON.parse(handleLedgerClaims(root, { scope: "session.ts" }).text);
    expect(byPath.claims[0].id).toBe("claims#1");
  });
});

describe("buildMcpServer", () => {
  it("constructs a server exposing the five blueprint tools", () => {
    const server = buildMcpServer(root);
    expect(server).toBeDefined();
    // registered tool names live on the underlying registry
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(Object.keys(tools).sort()).toEqual([
      "anchor_verify",
      "ledger_claims",
      "ledger_search",
      "trace_add_decision",
      "trace_score",
    ]);
  });
});
