import type { Claim, LedgerDiff, VerifyReport } from "./types.js";
import { parseAnchorRef } from "./anchors.js";

/**
 * ledger-report.md + Checks API payload rendering (blueprint §1.6 / §1.7).
 * Shared by `edt render` and the GitHub Action.
 */

export interface ReportContext {
  pr?: number;
  headSha?: string;
  baseRef?: string;
  baseCount: number;
  headCount: number;
}

function claimLine(c: Claim): string[] {
  const out = [`### ${c.claim_id} — ${c.text}  [${c.support_level}]`];
  for (const a of c.anchors) {
    out.push(`- Anchor: \`${a.ref}\` · confidence: ${a.confidence}`);
    if (a.quote) out.push(`  - Quote: "${a.quote}"`);
  }
  return out;
}

export function renderLedgerReport(
  diff: LedgerDiff,
  verify: VerifyReport,
  ctx: ReportContext,
): string {
  const header =
    ctx.pr != null
      ? `# Ledger diff — PR #${ctx.pr} (${ctx.headSha ?? "HEAD"} vs ${ctx.baseRef ?? "base"})`
      : `# Ledger report (${ctx.headSha ?? "HEAD"})`;

  const totalAnchors = verify.fresh + verify.stale + verify.unverifiable;
  const lines: string[] = [
    header,
    "",
    `**${ctx.baseCount} claims → ${ctx.headCount} claims** · +${diff.added.length} added · ` +
      `${diff.modified.length} modified · ${diff.removed.length} removed` +
      (verify.stale > 0 ? ` · ⚠ ${verify.stale} stale anchor${verify.stale === 1 ? "" : "s"}` : ""),
    "",
    `Anchors verified: ${verify.fresh}/${totalAnchors} fresh` +
      (verify.unverifiable > 0 ? ` (${verify.unverifiable} unverifiable offline)` : ""),
  ];

  if (diff.added.length > 0) {
    lines.push("", "## Added");
    for (const c of diff.added) lines.push(...claimLine(c), "");
  }
  if (diff.modified.length > 0) {
    lines.push("", "## Modified");
    for (const { after } of diff.modified) lines.push(...claimLine(after), "");
  }
  if (diff.removed.length > 0) {
    lines.push("", "## Removed");
    for (const c of diff.removed) lines.push(`- ${c.claim_id} — ${c.text}`);
  }
  if (diff.downgraded.length > 0) {
    lines.push("", "## Downgraded");
    for (const d of diff.downgraded) {
      lines.push(`- ${d.claim_id}  [${d.from} → ${d.to}]`);
    }
  }

  const stale = verify.results.filter((r) => r.anchor.status === "stale");
  if (stale.length > 0) {
    lines.push("", "## Stale ⚠");
    for (const s of stale) {
      lines.push(
        `### ${s.owner} — ${s.text}`,
        `- Anchor \`${s.anchor.ref}\` no longer resolves`,
        `  (${s.anchor.detail}). Re-anchor or downgrade.`,
        "",
      );
    }
  }
  return lines.join("\n").trimEnd() + "\n";
}

// ── Checks API payload (blueprint §1.7) ─────────────────────────────────────

export interface CheckRunAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: "notice" | "warning" | "failure";
  title: string;
  message: string;
}

export interface CheckRunPayload {
  name: "claims-ledger/verify";
  head_sha: string;
  conclusion: "neutral" | "success" | "action_required";
  output: {
    title: string;
    summary: string;
    annotations: CheckRunAnnotation[];
  };
}

export function buildCheckRunPayload(
  diff: LedgerDiff,
  verify: VerifyReport,
  ctx: ReportContext,
): CheckRunPayload {
  const staleResults = verify.results.filter((r) => r.anchor.status === "stale");
  const totalAnchors = verify.fresh + verify.stale + verify.unverifiable;

  const annotations: CheckRunAnnotation[] = staleResults.slice(0, 50).map((s) => {
    const parsed = parseAnchorRef(s.anchor.ref);
    const path =
      parsed && (parsed.scheme === "git" || parsed.scheme === "doc") ? parsed.path : ".ledger/claims.md";
    const startLine = parsed && parsed.scheme === "git" ? parsed.startLine : 1;
    const endLine = parsed && parsed.scheme === "git" ? parsed.endLine : 1;
    return {
      path,
      start_line: startLine,
      end_line: endLine,
      annotation_level: "warning",
      title: `Stale anchor for ${s.owner}`,
      message:
        `This change breaks the anchor for ${s.owner} ('${s.text.slice(0, 80)}...'). ` +
        `Run \`edt reanchor ${s.owner}\` or accept the downgrade to tentative. (${s.anchor.detail})`,
    };
  });

  const conclusion: CheckRunPayload["conclusion"] =
    verify.stale > 0 ? "action_required" : verify.tentative > 0 ? "neutral" : "success";

  const titleParts: string[] = [];
  if (verify.stale > 0) titleParts.push(`${verify.stale} stale anchor${verify.stale === 1 ? "" : "s"}`);
  if (diff.added.length > 0) titleParts.push(`${diff.added.length} new claim${diff.added.length === 1 ? "" : "s"}`);
  if (titleParts.length === 0) titleParts.push("all anchors fresh");

  return {
    name: "claims-ledger/verify",
    head_sha: ctx.headSha ?? "",
    conclusion,
    output: {
      title: titleParts.join(", "),
      summary: `${ctx.baseCount} → ${ctx.headCount} claims · anchors verified: ${verify.fresh}/${totalAnchors} fresh`,
      annotations,
    },
  };
}
