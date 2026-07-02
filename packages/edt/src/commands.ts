import * as fs from "node:fs";
import * as path from "node:path";
import {
  EXIT,
  diffLedgers,
  mergePanelScores,
  newTrace,
  nextDecisionId,
  parseAnchorRef,
  recomputeSummary,
  renderLedgerReport,
  renderPrBody,
  resolveQuote,
  schemeOf,
  supportFromAnchors,
  supportFromPanel,
  verifyAll,
  type AnchorRef,
  type Claim,
  type Decision,
  type DecisionKind,
  type JudgePanel,
  type Trace,
  type VerifyReport,
} from "@claims-ledger/ledger-core";
import {
  CLAIMS_MD,
  CLAIMS_TEMPLATE,
  LEDGER_DIR,
  LEDGER_JSON,
  PRE_COMMIT_HOOK,
  TRACES_DIR,
  currentBranch,
  findTrace,
  git,
  headSha,
  loadClaims,
  saveTrace,
  touchedPaths,
  tracePathFor,
} from "./workspace.js";

export interface Io {
  out(line: string): void;
  err(line: string): void;
}

export const consoleIo: Io = {
  out: (l) => console.log(l),
  err: (l) => console.error(l),
};

// ── edt init ────────────────────────────────────────────────────────────────

export function cmdInit(root: string, io: Io): number {
  const dir = path.join(root, LEDGER_DIR);
  fs.mkdirSync(path.join(root, TRACES_DIR), { recursive: true });
  const claims = path.join(root, CLAIMS_MD);
  if (!fs.existsSync(claims)) {
    fs.writeFileSync(claims, CLAIMS_TEMPLATE, "utf-8");
    io.out(`created ${CLAIMS_MD}`);
  } else {
    io.out(`${CLAIMS_MD} already exists — left untouched`);
  }
  const hookPath = path.join(root, ".git", "hooks", "pre-commit");
  if (fs.existsSync(path.join(root, ".git"))) {
    if (!fs.existsSync(hookPath)) {
      fs.writeFileSync(hookPath, PRE_COMMIT_HOOK, "utf-8");
      fs.chmodSync(hookPath, 0o755);
      io.out("installed .git/hooks/pre-commit (edt verify --only-touched --gate)");
    } else {
      io.out("pre-commit hook already exists — not overwriting (add `edt verify --only-touched --gate` manually)");
    }
  }
  io.out(`ledger workspace ready at ${path.relative(process.cwd(), dir) || dir}`);
  return EXIT.OK;
}

// ── edt trace new / add-decision / score ────────────────────────────────────

export function cmdTraceNew(
  root: string,
  io: Io,
  opts: { pr?: number; agent?: string },
): number {
  const branch = currentBranch(root);
  const trace = newTrace({
    branch,
    ...(opts.pr != null ? { pr: opts.pr } : {}),
    ...(opts.agent ? { agent: { name: opts.agent } } : {}),
  });
  const p = tracePathFor(root, { pr: opts.pr, branch });
  if (fs.existsSync(p)) {
    io.err(`trace already exists: ${path.relative(root, p)}`);
    return 1;
  }
  saveTrace(p, trace);
  io.out(`opened trace ${trace.trace_id} → ${path.relative(root, p)}`);
  return EXIT.OK;
}

export interface AddDecisionOpts {
  text: string;
  kind: DecisionKind;
  anchors: string[];
  quotes: string[];
  confidence: "high" | "medium" | "low";
  trace?: string;
  /** skip quote resolution (records the anchor but support stays tentative-grade) */
  force?: boolean;
}

/**
 * Anti-fabrication gate (blueprint §2.3): a git:// or doc:// anchor with a
 * quote is only accepted when the quote literally resolves at the ref in the
 * working tree. An LLM can hallucinate a justification; it cannot hallucinate
 * a string into a commit.
 */
export function cmdTraceAddDecision(root: string, io: Io, opts: AddDecisionOpts): number {
  const found = findTrace(root, opts.trace);
  if (!found) {
    io.err("no trace open for this branch — run `edt trace new` first");
    return EXIT.TRACE_MISSING;
  }
  const anchors: AnchorRef[] = [];
  for (let i = 0; i < opts.anchors.length; i++) {
    const ref = opts.anchors[i]!;
    const scheme = schemeOf(ref);
    if (!scheme || !parseAnchorRef(ref)) {
      io.err(`malformed anchor ref: ${ref}`);
      return 1;
    }
    const quote = opts.quotes[i];
    if (quote && !opts.force && (scheme === "git" || scheme === "doc")) {
      const parsed = parseAnchorRef(ref)!;
      const target = parsed.scheme === "git" || parsed.scheme === "doc" ? parsed.path : null;
      const filePath = target ? path.join(root, target) : null;
      const content = filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
      if (!content || !resolveQuote(quote, content)) {
        io.err(`rejected anchor ${ref}: quote does not resolve at ref ("${quote.slice(0, 60)}…")`);
        io.err("anchors must carry a verbatim quote that resolves at the pinned source (use --force to override)");
        return 1;
      }
    }
    anchors.push({ scheme, ref, confidence: opts.confidence, ...(quote ? { quote } : {}) });
  }

  const decision: Decision = {
    decision_id: nextDecisionId(found.trace),
    text: opts.text,
    kind: opts.kind,
    support_level: supportFromAnchors({ anchors }),
    anchors,
  };
  found.trace.decisions.push(decision);
  found.trace.summary = recomputeSummary(found.trace);
  saveTrace(path.isAbsolute(found.path) ? found.path : path.join(root, found.path), found.trace);
  io.out(`${decision.decision_id} [${decision.support_level}] ${decision.kind}: ${decision.text}`);
  return EXIT.OK;
}

export async function cmdTraceScore(
  root: string,
  io: Io,
  panel: JudgePanel,
  opts: { trace?: string } = {},
): Promise<number> {
  const found = findTrace(root, opts.trace);
  if (!found) {
    io.err("no trace found — run `edt trace new` first");
    return EXIT.TRACE_MISSING;
  }
  let flagged = 0;
  for (const d of found.trace.decisions) {
    const scores = await panel.score({
      text: d.text,
      evidence: d.anchors.map((a) => a.quote ?? a.ref),
      dimension: "claim_defensibility",
    });
    const merged = mergePanelScores(scores);
    if (!merged) {
      io.out(`${d.decision_id}: scoring skipped (fewer than 2 valid panel votes — no API key?)`);
      continue;
    }
    d.panel = merged;
    d.support_level = supportFromPanel(merged);
    if (merged.flagged) flagged++;
    io.out(
      `${d.decision_id}: panel ${merged.scores.join(" / ")} → median ${merged.median}` +
        (merged.flagged ? ` ⚠ spread ${merged.spread} > 20 — human look required` : ""),
    );
  }
  found.trace.summary = recomputeSummary(found.trace);
  saveTrace(path.isAbsolute(found.path) ? found.path : path.join(root, found.path), found.trace);
  return flagged > 0 ? EXIT.PANEL_SPREAD : EXIT.OK;
}

// ── edt verify ──────────────────────────────────────────────────────────────

export interface VerifyOpts {
  gate?: boolean;
  trace?: string;
  onlyTouched?: boolean;
  count?: boolean;
  requireTrace?: boolean;
}

export function cmdVerify(root: string, io: Io, opts: VerifyOpts): number {
  const claims = loadClaims(root);
  const found = findTrace(root, opts.trace);
  if (opts.requireTrace && !found) {
    io.err("trace missing for this branch and config requires one (exit 13)");
    return opts.gate ? EXIT.TRACE_MISSING : EXIT.OK;
  }

  let report: VerifyReport;
  try {
    report = verifyAll(
      { claims, decisions: found?.trace.decisions ?? [] },
      {
        rootDir: root,
        ...(opts.onlyTouched ? { onlyPaths: touchedPaths(root) } : {}),
      },
    );
  } catch (e) {
    io.err(`internal error: ${(e as Error).message}`);
    return EXIT.INTERNAL_ERROR;
  }

  if (opts.count) {
    io.out(String(report.stale));
    return opts.gate && report.exitCode !== EXIT.OK ? report.exitCode : EXIT.OK;
  }

  const total = report.fresh + report.stale + report.unverifiable;
  io.out(
    `anchors: ${report.fresh}/${total} fresh` +
      (report.stale > 0 ? ` · ${report.stale} stale` : "") +
      (report.unverifiable > 0 ? ` · ${report.unverifiable} unverifiable (never gate)` : ""),
  );
  for (const r of report.results) {
    const mark = r.anchor.status === "fresh" ? "✓" : r.anchor.status === "stale" ? "✖" : "·";
    if (r.anchor.status !== "fresh") {
      io.out(`${mark} ${r.owner} ${r.anchor.ref}`);
      io.out(`    ${r.anchor.detail}`);
    }
  }
  if (report.tentative > 0) io.out(`tentative (unanchored) items: ${report.tentative}`);
  if (report.flaggedSpread > 0) io.out(`panel-flagged items (spread > 20): ${report.flaggedSpread}`);

  if (!opts.gate) return EXIT.OK;
  if (report.exitCode !== EXIT.OK) {
    const why: Record<number, string> = {
      [EXIT.TENTATIVE]: "≥1 item is tentative (unanchored)",
      [EXIT.STALE_ANCHOR]: "≥1 stale anchor",
      [EXIT.PANEL_SPREAD]: "panel spread > 20 on ≥1 decision",
    };
    io.err(`gate: FAIL — ${why[report.exitCode] ?? "see report"} (exit ${report.exitCode})`);
  } else {
    io.out("gate: PASS — all anchored, all fresh");
  }
  return report.exitCode;
}

// ── edt reanchor ────────────────────────────────────────────────────────────

/**
 * Re-run the resolver cascade for a claim's stale anchors against the current
 * tree and rewrite `.ledger/claims.md` in place (targeted ref replacement, so
 * hand-written ledger formatting survives).
 */
export function cmdReanchor(root: string, io: Io, claimId: string, opts: { write?: boolean } = {}): number {
  const claimsPath = path.join(root, CLAIMS_MD);
  if (!fs.existsSync(claimsPath)) {
    io.err(`no ${CLAIMS_MD} — run \`edt init\``);
    return 1;
  }
  const claims = loadClaims(root);
  const claim = claims.find((c) => c.claim_id === claimId);
  if (!claim) {
    io.err(`unknown claim: ${claimId}`);
    return 1;
  }
  let md = fs.readFileSync(claimsPath, "utf-8");
  const sha = headSha(root);
  let updated = 0;
  let unresolved = 0;

  for (const anchor of claim.anchors) {
    const parsed = parseAnchorRef(anchor.ref);
    if (!parsed || (parsed.scheme !== "git" && parsed.scheme !== "doc") || !anchor.quote) continue;

    // candidate files: the original path first, then every tracked file that
    // still contains the quote (rename-following without needing git log)
    const candidates: string[] = [];
    if (fs.existsSync(path.join(root, parsed.path))) candidates.push(parsed.path);
    // the ledger itself quotes every anchor — never a reanchor candidate
    const tracked = (git(root, ["ls-files"]) ?? "")
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.startsWith(`${LEDGER_DIR}/`));
    for (const f of tracked) if (!candidates.includes(f)) candidates.push(f);

    let done = false;
    for (const candidate of candidates) {
      const filePath = path.join(root, candidate);
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }
      const res = resolveQuote(anchor.quote, content);
      if (!res) continue;
      const newRef =
        parsed.scheme === "git"
          ? `git://${sha}/${candidate}#L${res.startLine + 1}-L${res.endLine + 1}`
          : `doc://${candidate}#${parsed.headingSlug}@${sha}`;
      if (newRef !== anchor.ref) {
        md = md.split(anchor.ref).join(newRef);
        io.out(`${claimId}: ${anchor.ref}`);
        io.out(`      → ${newRef}  (${res.method}, score ${res.score.toFixed(2)})`);
        updated++;
      } else {
        io.out(`${claimId}: ${anchor.ref} already fresh`);
      }
      done = true;
      break;
    }
    if (!done) {
      io.err(`${claimId}: could not re-resolve quote "${anchor.quote.slice(0, 50)}…" anywhere in the tree`);
      unresolved++;
    }
  }

  if (updated > 0 && opts.write !== false) {
    fs.writeFileSync(claimsPath, md, "utf-8");
    io.out(`rewrote ${CLAIMS_MD} (${updated} anchor${updated === 1 ? "" : "s"} updated)`);
  }
  return unresolved > 0 ? EXIT.STALE_ANCHOR : EXIT.OK;
}

// ── edt render / export ─────────────────────────────────────────────────────

export function cmdRender(root: string, io: Io, opts: { format: string; trace?: string }): number {
  if (opts.format === "pr-body") {
    const found = findTrace(root, opts.trace);
    if (!found) {
      io.err("no trace to render — run `edt trace new` first");
      return EXIT.TRACE_MISSING;
    }
    io.out(renderPrBody(found.trace));
    return EXIT.OK;
  }
  if (opts.format === "report") {
    const claims = loadClaims(root);
    const report = verifyAll({ claims }, { rootDir: root });
    const diff = diffLedgers(claims, claims); // no base in local render
    io.out(
      renderLedgerReport(diff, report, {
        headSha: headSha(root),
        baseCount: claims.length,
        headCount: claims.length,
      }),
    );
    return EXIT.OK;
  }
  io.err(`unknown format: ${opts.format} (expected pr-body | report)`);
  return 1;
}

export function cmdExport(root: string, io: Io, opts: { format: string; trace?: string }): number {
  if (opts.format !== "ledger-json") {
    io.err(`unknown format: ${opts.format} (expected ledger-json)`);
    return 1;
  }
  const claims: Claim[] = loadClaims(root);
  const found = findTrace(root, opts.trace);
  if (found) {
    // merge accepted (non-tentative) decisions as new claims
    let next = claims.reduce((m, c) => Math.max(m, parseInt(c.claim_id.replace(/^claims#/, ""), 10) || 0), 0);
    for (const d of found.trace.decisions) {
      if (d.support_level === "tentative") continue;
      next++;
      claims.push({
        claim_id: `claims#${next}`,
        text: d.text,
        support_level: d.support_level,
        candidate_scopes: [d.kind],
        anchors: d.anchors,
        provenance: { extracted_by: `edt/0.1.0`, ...(found.trace.pr != null ? { pr: found.trace.pr } : {}) },
      });
    }
  }
  const out = path.join(root, LEDGER_JSON);
  fs.writeFileSync(out, JSON.stringify(claims, null, 2) + "\n", "utf-8");
  io.out(`wrote ${LEDGER_JSON}: ${claims.length} claims, ${claims.reduce((n, c) => n + c.anchors.length, 0)} anchors`);
  return EXIT.OK;
}

export type { Trace };
