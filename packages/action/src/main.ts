import * as fs from "node:fs";
import { parseFailOn, runAction, type ActionInputs } from "./run.js";

/**
 * GitHub Actions entrypoint (node20 runner). Inputs arrive as INPUT_* env
 * vars — read directly so the dist bundle carries zero runtime dependencies
 * beyond ledger-core (which esbuild inlines).
 */

function input(name: string, fallback = ""): string {
  return (process.env[`INPUT_${name.replace(/-/g, "_").toUpperCase()}`] ?? fallback).trim();
}

function setOutput(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (file) {
    const delim = `ghadelim_${Date.now()}`;
    fs.appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
  } else {
    console.log(`::set-output name=${name}::${value}`);
  }
}

async function postCheckRun(payload: object): Promise<void> {
  const token = input("github-token") || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log("::notice::no github-token/repository — check-run payload written but not posted");
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/check-runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.log(`::warning::check-run POST failed: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.log(`::warning::check-run POST failed: ${(e as Error).message}`);
  }
}

async function main(): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  let pr: number | undefined;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
      pr = event.pull_request?.number ?? event.number;
    } catch {
      /* non-PR event */
    }
  }

  const docsGlobs = input("docs-globs")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const inputs: ActionInputs = {
    ledgerPath: input("ledger-path", ".ledger/claims.md"),
    mode: (input("mode", "both") as ActionInputs["mode"]) || "both",
    failOn: parseFailOn(input("fail-on", "stale-anchor,unanchored-strong")),
    transcriptsDir: input("transcripts-dir", ".ledger/transcripts"),
    ...(docsGlobs.length > 0 ? { docsGlobs } : {}),
    ...(input("extract-model") ? { extractModel: input("extract-model") } : {}),
    ...(input("openrouter-api-key") ? { openrouterApiKey: input("openrouter-api-key") } : {}),
    ...(process.env.GITHUB_SHA ? { headSha: process.env.GITHUB_SHA } : {}),
    ...(process.env.GITHUB_BASE_REF ? { baseRef: process.env.GITHUB_BASE_REF } : {}),
    ...(pr != null ? { pr } : {}),
  };

  const result = await runAction(workspace, inputs);

  for (const n of result.notices) console.log(`::notice::${n}`);

  setOutput("ledger-diff", JSON.stringify(result.ledgerDiffSummary));
  setOutput("report-path", result.reportPath);

  // persist the check-run payload next to the report (useful as an artifact
  // and for debugging), then post it when we have credentials + a head sha
  const payloadPath = result.reportPath.replace(/ledger-report\.md$/, "check-run.json");
  fs.writeFileSync(`${workspace}/${payloadPath}`, JSON.stringify(result.checkRun, null, 2) + "\n");
  if (inputs.mode !== "extract" && result.checkRun.head_sha) {
    await postCheckRun(result.checkRun);
  }

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) fs.appendFileSync(summaryFile, result.report + "\n");

  console.log(result.report);

  if (result.failed) {
    for (const r of result.failureReasons) console.log(`::error::claims-ledger: ${r}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  // internal errors never gate (blueprint exit-code table: reported neutral)
  console.log(`::warning::claims-ledger internal error (not gating): ${(e as Error).stack}`);
  process.exitCode = 0;
});
