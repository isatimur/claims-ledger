import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { parseLedger, type Claim, type Trace } from "@claims-ledger/ledger-core";

/** Filesystem + git plumbing for the `.ledger/` workspace. */

export const LEDGER_DIR = ".ledger";
export const CLAIMS_MD = path.join(LEDGER_DIR, "claims.md");
export const LEDGER_JSON = path.join(LEDGER_DIR, "ledger.json");
export const TRACES_DIR = path.join(LEDGER_DIR, "traces");

export interface Workspace {
  root: string;
}

export function findRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, LEDGER_DIR)) || fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(startDir);
    dir = parent;
  }
}

export function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function currentBranch(root: string): string {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "detached";
}

export function headSha(root: string, short = true): string {
  return git(root, ["rev-parse", ...(short ? ["--short"] : []), "HEAD"]) ?? "0000000";
}

/** Paths changed in the working tree + index (for `verify --only-touched`). */
export function touchedPaths(root: string): string[] {
  const out = git(root, ["status", "--porcelain"]);
  if (!out) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).trim())
    .map((l) => (l.includes(" -> ") ? l.split(" -> ")[1]! : l))
    .map((l) => l.replace(/^"|"$/g, ""));
}

export function loadClaims(root: string): Claim[] {
  const p = path.join(root, CLAIMS_MD);
  if (!fs.existsSync(p)) return [];
  return parseLedger(fs.readFileSync(p, "utf-8"));
}

export function tracePathFor(root: string, opts: { pr?: number; branch?: string }): string {
  const name =
    opts.pr != null
      ? `pr-${opts.pr}.trace.json`
      : `branch-${(opts.branch ?? currentBranch(root)).replace(/[^A-Za-z0-9._-]+/g, "-")}.trace.json`;
  return path.join(root, TRACES_DIR, name);
}

export function loadTrace(p: string): Trace | null {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Trace;
}

export function saveTrace(p: string, trace: Trace): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(trace, null, 2) + "\n", "utf-8");
}

/** Find the trace for the current branch/PR, if any. */
export function findTrace(root: string, explicit?: string): { path: string; trace: Trace } | null {
  if (explicit) {
    const t = loadTrace(path.isAbsolute(explicit) ? explicit : path.join(root, explicit));
    return t ? { path: explicit, trace: t } : null;
  }
  const dir = path.join(root, TRACES_DIR);
  if (!fs.existsSync(dir)) return null;
  const branchFile = tracePathFor(root, { branch: currentBranch(root) });
  const t = loadTrace(branchFile);
  if (t) return { path: branchFile, trace: t };
  // fall back to the most recently modified trace
  const entries = fs
    .readdirSync(dir)
    .filter((e) => e.endsWith(".trace.json"))
    .map((e) => path.join(dir, e))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const first = entries[0];
  if (!first) return null;
  const trace = loadTrace(first);
  return trace ? { path: first, trace } : null;
}

export const CLAIMS_TEMPLATE = `# Claims Ledger

> Every claim below carries a machine-verifiable anchor. \`edt verify --gate\`
> fails CI when an anchor goes stale. No anchor, no strong claim.
>
> Format: \`## <n>) <claim text>\` blocks with **Support level**, **Anchor**
> (\`yt://\`, \`ts://\`, \`git://\`, \`doc://\`, \`adr://\`, \`gh://\`) and verbatim **Quote** lines.
`;

export const PRE_COMMIT_HOOK = `#!/usr/bin/env bash
# .git/hooks/pre-commit — installed by \`edt init\`.
# Fail fast on stale anchors touched by this commit.
command -v edt >/dev/null 2>&1 || exit 0   # edt not installed here — don't block
edt verify --only-touched --gate || {
  echo "✖ claims-ledger: your commit breaks one or more anchors."
  echo "  Run: edt reanchor <claim-id>  (or edt verify for details)"
  exit 1
}
`;
