import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildCheckRunPayload,
  diffLedgers,
  parseLedger,
  renderLedgerReport,
  verifyAll,
  type CheckRunPayload,
  type Claim,
  type LedgerDiff,
  type VerifyReport,
} from "@claims-ledger/ledger-core";

/**
 * The Action's core, kept pure-ish for testing: `runAction` takes resolved
 * inputs + a workspace dir and returns everything `main.ts` reports to GitHub.
 *
 * `verify` is fully real: parse the ledger, check every anchor's freshness
 * against the checked-out working tree, diff against the base branch's ledger,
 * and produce ledger-report.md + the check-run payload.
 *
 * `extract` (LLM claim mining) requires an OpenRouter key and is a stub in
 * this MVP: without a key it logs a skip notice — it never fabricates claims.
 */

export interface ActionInputs {
  ledgerPath: string;
  mode: "extract" | "verify" | "both";
  failOn: Set<string>;
  transcriptsDir: string;
  openrouterApiKey?: string;
  headSha?: string;
  baseRef?: string;
  pr?: number;
}

export interface ActionResult {
  diff: LedgerDiff;
  verify: VerifyReport;
  report: string;
  reportPath: string;
  checkRun: CheckRunPayload;
  ledgerDiffSummary: {
    added: number;
    modified: number;
    removed: number;
    downgraded: number;
    stale: number;
  };
  failed: boolean;
  failureReasons: string[];
  notices: string[];
}

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** The ledger as it exists on the base ref (the differ needs fetch-depth: 0). */
export function loadBaseClaims(workspace: string, ledgerPath: string, baseRef?: string): Claim[] {
  if (!baseRef) return [];
  for (const ref of [`origin/${baseRef}`, baseRef]) {
    const content = git(workspace, ["show", `${ref}:${ledgerPath}`]);
    if (content !== null) return parseLedger(content);
  }
  return [];
}

export function runAction(workspace: string, inputs: ActionInputs): ActionResult {
  const notices: string[] = [];

  if (inputs.mode === "extract" || inputs.mode === "both") {
    if (inputs.openrouterApiKey) {
      notices.push(
        "extract: LLM claim mining is not implemented in this MVP build — skipping (verify still runs).",
      );
    } else {
      notices.push("extract: skipped — no openrouter-api-key configured (flag-don't-fabricate).");
    }
  }

  const ledgerFile = path.join(workspace, inputs.ledgerPath);
  const headClaims = fs.existsSync(ledgerFile)
    ? parseLedger(fs.readFileSync(ledgerFile, "utf-8"))
    : [];
  if (!fs.existsSync(ledgerFile)) {
    notices.push(`no ledger at ${inputs.ledgerPath} — run \`npx @claims-ledger/edt init\` to scaffold one.`);
  }

  const baseClaims = loadBaseClaims(workspace, inputs.ledgerPath, inputs.baseRef);
  const diff = diffLedgers(baseClaims, headClaims);

  const verify = verifyAll(
    { claims: headClaims },
    { rootDir: workspace, transcriptsDir: inputs.transcriptsDir },
  );

  const ctx = {
    pr: inputs.pr,
    headSha: inputs.headSha,
    baseRef: inputs.baseRef,
    baseCount: baseClaims.length,
    headCount: headClaims.length,
  };
  const report = renderLedgerReport(diff, verify, ctx);
  const reportPath = path.join(path.dirname(inputs.ledgerPath), "ledger-report.md");
  fs.mkdirSync(path.dirname(path.join(workspace, reportPath)), { recursive: true });
  fs.writeFileSync(path.join(workspace, reportPath), report, "utf-8");

  const checkRun = buildCheckRunPayload(diff, verify, ctx);

  // fail-on gate matrix
  const failureReasons: string[] = [];
  if (inputs.failOn.has("stale-anchor") && verify.stale > 0) {
    failureReasons.push(`${verify.stale} stale anchor(s)`);
  }
  if (inputs.failOn.has("unanchored-strong")) {
    const unanchoredStrong = headClaims.filter(
      (c) => c.support_level === "strong" && c.anchors.filter((a) => a.quote).length === 0,
    );
    if (unanchoredStrong.length > 0) {
      failureReasons.push(
        `${unanchoredStrong.length} strong claim(s) without a quoted anchor: ${unanchoredStrong
          .map((c) => c.claim_id)
          .join(", ")}`,
      );
    }
  }
  if (inputs.failOn.has("support-downgrade") && diff.downgraded.length > 0) {
    failureReasons.push(
      `${diff.downgraded.length} support downgrade(s): ${diff.downgraded
        .map((d) => `${d.claim_id} ${d.from}→${d.to}`)
        .join(", ")}`,
    );
  }

  return {
    diff,
    verify,
    report,
    reportPath,
    checkRun,
    ledgerDiffSummary: {
      added: diff.added.length,
      modified: diff.modified.length,
      removed: diff.removed.length,
      downgraded: diff.downgraded.length,
      stale: verify.stale,
    },
    failed: failureReasons.length > 0,
    failureReasons,
    notices,
  };
}

export function parseFailOn(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
