import type { Decision, SupportLevel, Trace } from "./types.js";

/** trace-v1 helpers: construction, summary recomputation, PR-body rendering. */

export function newTrace(opts: {
  branch: string;
  pr?: number;
  agent?: Trace["agent"];
  date?: Date;
}): Trace {
  const d = opts.date ?? new Date();
  const day = d.toISOString().slice(0, 10);
  const suffix = opts.pr != null ? String(opts.pr) : opts.branch.replace(/[^A-Za-z0-9]+/g, "-");
  return {
    $schema: "https://claims-ledger.dev/schemas/trace-v1.json",
    trace_id: `edt-${day}-${suffix}`,
    ...(opts.agent ? { agent: opts.agent } : {}),
    branch: opts.branch,
    ...(opts.pr != null ? { pr: opts.pr } : {}),
    decisions: [],
    summary: { decisions: 0, strong: 0, moderate: 0, tentative: 0, stale_anchors: 0 },
  };
}

export function nextDecisionId(trace: Trace): string {
  return `edt#${trace.decisions.length + 1}`;
}

export function recomputeSummary(trace: Trace, staleAnchors = 0): Trace["summary"] {
  const count = (level: SupportLevel) =>
    trace.decisions.filter((d) => d.support_level === level).length;
  return {
    decisions: trace.decisions.length,
    strong: count("strong"),
    moderate: count("moderate"),
    tentative: count("tentative"),
    stale_anchors: staleAnchors,
  };
}

/** Support level derived from anchors alone (panel scoring can upgrade/downgrade later). */
export function supportFromAnchors(decision: Pick<Decision, "anchors">): SupportLevel {
  if (decision.anchors.length === 0) return "tentative";
  const withQuote = decision.anchors.filter((a) => a.quote);
  if (withQuote.some((a) => a.confidence === "high")) return "strong";
  if (withQuote.length > 0 || decision.anchors.some((a) => a.confidence === "high")) {
    return "moderate";
  }
  return "tentative";
}

/**
 * Render the fenced PR-body block (blueprint §2.4). The Action parses and
 * verifies this server-side, so agents that can't run binaries can still emit
 * the text.
 */
export function renderPrBody(trace: Trace): string {
  const lines: string[] = ["```edt-trace v1", `trace: ${trace.trace_id}`];
  for (const d of trace.decisions) {
    lines.push(`- ${d.decision_id} [${d.support_level}] ${d.kind}: ${d.text}`);
    for (const a of d.anchors) {
      lines.push(`  ⚓ ${a.ref}${a.quote ? ` "${a.quote}"` : ""}`);
    }
  }
  lines.push("```");
  return lines.join("\n");
}

const TRACE_FENCE_RE = /```edt-trace v1\n([\s\S]*?)```/;
const DECISION_LINE_RE = /^-\s+(edt#\d+)\s+\[(\w+)\]\s+(\w+):\s+(.+)$/;
const ANCHOR_LINE_RE = /^\s+⚓\s+(\S+(?:\s+\d\d:\d\d:\d\d\.\d\d\d\s*(?:→|-{1,2}>)\s*\d\d:\d\d:\d\d\.\d\d\d)?)(?:\s+"(.+)")?\s*$/;

/** Parse the PR-body block back into a minimal trace (Action `verify` path). */
export function parsePrBody(body: string): Pick<Trace, "trace_id" | "decisions"> | null {
  const fence = TRACE_FENCE_RE.exec(body);
  if (!fence) return null;
  let traceId = "";
  const decisions: Decision[] = [];
  for (const raw of fence[1]!.split("\n")) {
    const t = /^trace:\s*(\S+)/.exec(raw);
    if (t) {
      traceId = t[1]!;
      continue;
    }
    const d = DECISION_LINE_RE.exec(raw);
    if (d) {
      decisions.push({
        decision_id: d[1]!,
        support_level: (d[2] as SupportLevel) ?? "tentative",
        kind: d[3] as Decision["kind"],
        text: d[4]!,
        anchors: [],
      });
      continue;
    }
    const a = ANCHOR_LINE_RE.exec(raw);
    if (a && decisions.length > 0) {
      const ref = a[1]!.trim();
      const scheme = ref.split("://")[0] as Decision["anchors"][number]["scheme"];
      decisions[decisions.length - 1]!.anchors.push({
        scheme,
        ref,
        confidence: "medium",
        ...(a[2] ? { quote: a[2] } : {}),
      });
    }
  }
  if (!traceId) return null;
  return { trace_id: traceId, decisions };
}
