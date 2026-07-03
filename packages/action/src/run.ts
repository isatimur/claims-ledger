import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildCheckRunPayload,
  diffLedgers,
  extractClaims,
  parseLedger,
  renderLedgerReport,
  renderProposedClaims,
  verifyAll,
  type CheckRunPayload,
  type Claim,
  type CompleteFn,
  type ExtractSource,
  type LedgerDiff,
  type VerifyReport,
} from "@claims-ledger/ledger-core";
import { openrouterComplete } from "@claims-ledger/edt";

/**
 * The Action's core, kept pure-ish for testing: `runAction` takes resolved
 * inputs + a workspace dir and returns everything `main.ts` reports to GitHub.
 *
 * `verify` is fully real: parse the ledger, check every anchor's freshness
 * against the checked-out working tree, diff against the base branch's ledger,
 * and produce ledger-report.md + the check-run payload.
 *
 * `extract` (LLM claim mining) requires an OpenRouter key; without one it
 * logs a skip notice — it never fabricates claims. With a key it mines claim
 * drafts from the PR's changed docs/code, anchors each draft's verbatim quote
 * through the resolver cascade (fabricated quotes are rejected), and writes
 * the survivors to `.ledger/claims.proposed.md` for human review.
 */

export interface ActionInputs {
  ledgerPath: string;
  mode: "extract" | "verify" | "both";
  failOn: Set<string>;
  transcriptsDir: string;
  docsGlobs?: string[];
  extractModel?: string;
  openrouterApiKey?: string;
  headSha?: string;
  baseRef?: string;
  pr?: number;
  /** injectable LLM completer (tests); defaults to OpenRouter via the api key */
  complete?: CompleteFn;
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
  extract?: { accepted: number; rejected: number; errors: number; proposalsPath?: string };
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

/** naive glob → regex: `**` matches across dirs, `*` within a segment */
function globToRegex(glob: string): RegExp {
  const esc = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0001")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0001/g, "(?:.*/)?")
    ;
  return new RegExp(`^${esc}$`);
}

const EXTRACTABLE = /\.(md|mdx|markdown|txt|rst|adoc)$/i;
const MAX_EXCERPT = 8000;

/**
 * Sources for the claim miner: files changed vs the base ref (PR case),
 * falling back to the docs-globs when there is no base (push to main).
 */
export function extractSources(workspace: string, inputs: ActionInputs): ExtractSource[] {
  let candidates: string[] = [];
  if (inputs.baseRef) {
    for (const ref of [`origin/${inputs.baseRef}`, inputs.baseRef]) {
      const out = git(workspace, ["diff", "--name-only", "--diff-filter=ACMR", `${ref}...HEAD`]);
      if (out !== null) {
        candidates = out.split("\n").filter(Boolean);
        break;
      }
    }
  }
  if (candidates.length === 0) {
    const globs = (inputs.docsGlobs ?? ["docs/**/*.md", "README.md"]).map(globToRegex);
    const tracked = git(workspace, ["ls-files"]) ?? "";
    candidates = tracked.split("\n").filter(Boolean).filter((f) => globs.some((g) => g.test(f)));
  }
  return candidates
    .filter((f) => EXTRACTABLE.test(f) && !f.startsWith(".ledger/"))
    .map((f) => {
      const abs = path.join(workspace, f);
      if (!fs.existsSync(abs)) return null;
      const content = fs.readFileSync(abs, "utf-8");
      return {
        path: f,
        content,
        ...(content.length > MAX_EXCERPT ? { excerpt: content.slice(0, MAX_EXCERPT) } : {}),
      };
    })
    .filter((s): s is ExtractSource => s !== null);
}

export async function runAction(workspace: string, inputs: ActionInputs): Promise<ActionResult> {
  const notices: string[] = [];
  let extractSummary: ActionResult["extract"];

  const ledgerFile = path.join(workspace, inputs.ledgerPath);
  const headClaims = fs.existsSync(ledgerFile)
    ? parseLedger(fs.readFileSync(ledgerFile, "utf-8"))
    : [];
  if (!fs.existsSync(ledgerFile)) {
    notices.push(`no ledger at ${inputs.ledgerPath} — run \`npx @claims-ledger/edt init\` to scaffold one.`);
  }

  if (inputs.mode === "extract" || inputs.mode === "both") {
    if (!inputs.complete && !inputs.openrouterApiKey) {
      notices.push("extract: skipped — no openrouter-api-key configured (flag-don't-fabricate).");
    } else {
      const complete: CompleteFn =
        inputs.complete ??
        ((prompt) =>
          openrouterComplete(
            inputs.openrouterApiKey!,
            inputs.extractModel ?? "deepseek/deepseek-chat",
            prompt,
          ));
      const sources = extractSources(workspace, inputs);
      if (sources.length === 0) {
        notices.push("extract: no changed docs to mine claims from.");
      } else {
        const sha =
          git(workspace, ["rev-parse", "--short", "HEAD"]) ?? inputs.headSha?.slice(0, 7) ?? "0000000";
        const nextId =
          headClaims.reduce(
            (m, c) => Math.max(m, parseInt(c.claim_id.replace(/^claims#/, ""), 10) || 0),
            0,
          ) + 1;
        const result = await extractClaims(sources, complete, {
          sha,
          extractedBy: "auto-ledger-verify/0.2.0",
          existingClaims: headClaims.map((c) => c.text),
          nextId,
        });
        let proposalsPath: string | undefined;
        if (result.accepted.length > 0) {
          proposalsPath = path.join(path.dirname(inputs.ledgerPath), "claims.proposed.md");
          fs.mkdirSync(path.dirname(path.join(workspace, proposalsPath)), { recursive: true });
          fs.writeFileSync(
            path.join(workspace, proposalsPath),
            renderProposedClaims(result.accepted, result.rejected.length),
            "utf-8",
          );
        }
        notices.push(
          `extract: ${result.accepted.length} claim draft(s) anchored` +
            (result.rejected.length > 0
              ? ` · ${result.rejected.length} rejected (quote did not resolve — anti-fabrication)`
              : "") +
            (result.errors.length > 0 ? ` · ${result.errors.length} source(s) errored` : "") +
            (proposalsPath ? ` → ${proposalsPath}` : ""),
        );
        extractSummary = {
          accepted: result.accepted.length,
          rejected: result.rejected.length,
          errors: result.errors.length,
          ...(proposalsPath ? { proposalsPath } : {}),
        };
      }
    }
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
    ...(extractSummary ? { extract: extractSummary } : {}),
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
