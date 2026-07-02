import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { parseFailOn, runAction } from "../src/run.js";

let root: string;

function sh(args: string[]) {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function writeLedger(quote: string) {
  fs.mkdirSync(path.join(root, ".ledger"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".ledger/claims.md"),
    [
      "# Claims Ledger",
      "",
      "## 1) Session tokens rotate every 24 hours",
      "- **Support level:** strong",
      "  - **Anchor:** `git://abc1234/src/session.ts#L1-L1` · confidence: high",
      `    - **Quote:** "${quote}"`,
      "",
    ].join("\n"),
  );
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "action-test-"));
  sh(["init", "-q", "-b", "main"]);
  sh(["config", "user.email", "t@t"]);
  sh(["config", "user.name", "t"]);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(
    path.join(root, "src/session.ts"),
    "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;\n",
  );
  writeLedger("export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;");
  sh(["add", "-A"]);
  sh(["commit", "-qm", "base", "--no-verify"]);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const BASE_INPUTS = {
  ledgerPath: ".ledger/claims.md",
  mode: "verify" as const,
  failOn: parseFailOn("stale-anchor,unanchored-strong"),
  transcriptsDir: ".ledger/transcripts",
  headSha: "4f2a9c1000",
  baseRef: "main",
  pr: 481,
};

describe("action verify mode", () => {
  it("fresh ledger: success conclusion, no failure, report written", () => {
    const r = runAction(root, BASE_INPUTS);
    expect(r.failed).toBe(false);
    expect(r.verify.stale).toBe(0);
    expect(r.checkRun.conclusion).toBe("success");
    expect(r.checkRun.name).toBe("claims-ledger/verify");
    expect(fs.existsSync(path.join(root, ".ledger/ledger-report.md"))).toBe(true);
    expect(r.report).toContain("claims");
  });

  it("stale anchor: action_required, annotation on the anchored file, fail-on trips", () => {
    fs.writeFileSync(path.join(root, "src/session.ts"), "// gone\n");
    const r = runAction(root, BASE_INPUTS);
    expect(r.failed).toBe(true);
    expect(r.failureReasons.join()).toContain("stale anchor");
    expect(r.checkRun.conclusion).toBe("action_required");
    const ann = r.checkRun.output.annotations[0]!;
    expect(ann.path).toBe("src/session.ts");
    expect(ann.title).toContain("claims#1");
    expect(ann.message).toContain("edt reanchor claims#1");
    expect(r.report).toContain("## Stale ⚠");
  });

  it("unanchored-strong gate trips on a strong claim without quoted anchors", () => {
    fs.writeFileSync(
      path.join(root, ".ledger/claims.md"),
      ["# Claims Ledger", "", "## 2) Bold claim with a quote-less anchor", "- **Support level:** strong", "  - **Anchor:** `gh://issues/1` · confidence: medium", ""].join("\n"),
    );
    const r = runAction(root, BASE_INPUTS);
    expect(r.failed).toBe(true);
    expect(r.failureReasons.join()).toContain("strong claim(s) without a quoted anchor");
  });

  it("diffs against the base branch ledger (added claim shows up)", () => {
    // base is committed; add a claim on head (working tree only)
    fs.appendFileSync(
      path.join(root, ".ledger/claims.md"),
      [
        "## 2) The differ compares base to head",
        "- **Support level:** moderate",
        "  - **Anchor:** `git://abc1234/src/session.ts#L1-L1` · confidence: high",
        '    - **Quote:** "export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;"',
        "",
      ].join("\n"),
    );
    const r = runAction(root, BASE_INPUTS);
    expect(r.ledgerDiffSummary.added).toBe(1);
    expect(r.report).toContain("## Added");
    expect(r.report).toContain("claims#2");
  });

  it("support-downgrade gate trips when a claim weakens vs base", () => {
    writeLedger("export const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;");
    const md = fs.readFileSync(path.join(root, ".ledger/claims.md"), "utf-8");
    fs.writeFileSync(path.join(root, ".ledger/claims.md"), md.replace("strong", "tentative"));
    const r = runAction(root, {
      ...BASE_INPUTS,
      failOn: parseFailOn("support-downgrade"),
    });
    expect(r.failed).toBe(true);
    expect(r.failureReasons.join()).toContain("claims#1 strong→tentative");
    expect(r.ledgerDiffSummary.downgraded).toBe(1);
  });

  it("extract mode without an API key emits a skip notice, never fabricates", () => {
    const r = runAction(root, { ...BASE_INPUTS, mode: "both" });
    expect(r.notices.join()).toContain("no openrouter-api-key");
  });

  it("missing ledger is a notice, not a crash", () => {
    fs.rmSync(path.join(root, ".ledger/claims.md"));
    const r = runAction(root, { ...BASE_INPUTS, baseRef: undefined as unknown as string });
    expect(r.failed).toBe(false);
    expect(r.notices.join()).toContain("no ledger at");
  });
});
