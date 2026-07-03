import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  schemeOf,
  verifyAnchor,
  type AnchorRef,
  type Claim,
  type DecisionKind,
  type JudgePanel,
} from "@claims-ledger/ledger-core";
import { cmdTraceAddDecision, cmdTraceScore, type Io } from "./commands.js";
import { findTrace, loadClaims } from "./workspace.js";
import { panelFromEnv } from "./openrouter.js";

/**
 * `edt mcp serve` — the trace machinery as MCP tools (blueprint §2.3), so
 * Claude Code / Copilot / LangGraph nodes can prove their work mid-task:
 * find evidence BEFORE deciding (ledger_search), append anchored decisions
 * that cannot be fabricated (trace_add_decision runs the quote resolver and
 * rejects non-resolving quotes), score them (trace_score), and check what
 * their diff might invalidate (ledger_claims, anchor_verify).
 *
 * Handlers are plain functions over the workspace root — the server wrapper
 * is thin so tests exercise the handlers directly without a stdio transport.
 */

export interface ToolResult {
  text: string;
  isError?: boolean;
}

const ok = (data: unknown): ToolResult => ({
  text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
});
const err = (message: string): ToolResult => ({ text: message, isError: true });

function collectIo(): { io: Io; lines: string[] } {
  const lines: string[] = [];
  return { io: { out: (l) => lines.push(l), err: (l) => lines.push(l) }, lines };
}

// ── ledger_search ───────────────────────────────────────────────────────────

/** Keyword scoring: term overlap across claim text, scopes, and quotes. */
function scoreClaim(terms: string[], c: Claim): number {
  const hay = [
    c.text,
    ...c.candidate_scopes,
    ...c.anchors.map((a) => a.quote ?? ""),
    ...c.anchors.map((a) => a.ref),
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const t of terms) if (hay.includes(t)) score++;
  return score;
}

export function handleLedgerSearch(root: string, args: { query: string; k?: number }): ToolResult {
  const claims = loadClaims(root);
  const trace = findTrace(root);
  const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return err("query must contain at least one term");
  const k = args.k ?? 5;

  const scoredClaims = claims
    .map((c) => ({ c, score: scoreClaim(terms, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ c, score }) => ({
      kind: "claim" as const,
      id: c.claim_id,
      text: c.text,
      support_level: c.support_level,
      anchors: c.anchors.map((a) => ({ ref: a.ref, quote: a.quote })),
      score,
    }));

  const decisions = (trace?.trace.decisions ?? [])
    .map((d) => ({
      d,
      score: scoreClaim(terms, {
        claim_id: d.decision_id,
        text: d.text,
        support_level: d.support_level,
        candidate_scopes: [d.kind],
        anchors: d.anchors,
      }),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ d, score }) => ({
      kind: "decision" as const,
      id: d.decision_id,
      text: d.text,
      support_level: d.support_level,
      anchors: d.anchors.map((a) => ({ ref: a.ref, quote: a.quote })),
      score,
    }));

  return ok({ query: args.query, results: [...scoredClaims, ...decisions].slice(0, k) });
}

// ── trace_add_decision ──────────────────────────────────────────────────────

export interface AddDecisionArgs {
  text: string;
  kind?: DecisionKind;
  anchors: { ref: string; quote?: string; confidence?: "high" | "medium" | "low" }[];
}

export function handleTraceAddDecision(root: string, args: AddDecisionArgs): ToolResult {
  const { io, lines } = collectIo();
  const code = cmdTraceAddDecision(root, io, {
    text: args.text,
    kind: args.kind ?? "behavior",
    anchors: args.anchors.map((a) => a.ref),
    quotes: args.anchors.map((a) => a.quote ?? ""),
    confidence: args.anchors[0]?.confidence ?? "medium",
  });
  const out = lines.join("\n");
  // the anti-fabrication rejection surfaces as a tool error the agent can act on
  return code === 0 ? ok(out) : err(out || `trace_add_decision failed (exit ${code})`);
}

// ── trace_score ─────────────────────────────────────────────────────────────

export async function handleTraceScore(root: string, panel?: JudgePanel): Promise<ToolResult> {
  const { io, lines } = collectIo();
  const code = await cmdTraceScore(root, io, panel ?? panelFromEnv());
  const out = lines.join("\n");
  if (code !== 0 && code !== 12) return err(out || `trace_score failed (exit ${code})`);
  return ok(out + (code === 12 ? "\n⚠ panel spread > 20 on ≥1 decision — human look required" : ""));
}

// ── anchor_verify ───────────────────────────────────────────────────────────

export function handleAnchorVerify(root: string, args: { ref: string; quote?: string }): ToolResult {
  const scheme = schemeOf(args.ref);
  if (!scheme) return err(`malformed anchor ref: ${args.ref}`);
  const anchor: AnchorRef = {
    scheme,
    ref: args.ref,
    confidence: "medium",
    ...(args.quote ? { quote: args.quote } : {}),
  };
  const v = verifyAnchor(anchor, { rootDir: root });
  return ok({ ref: v.ref, status: v.status, detail: v.detail, ...(v.resolved ? { resolved: v.resolved } : {}) });
}

// ── ledger_claims ───────────────────────────────────────────────────────────

export function handleLedgerClaims(root: string, args: { scope?: string }): ToolResult {
  let claims = loadClaims(root);
  if (args.scope) {
    const s = args.scope.toLowerCase();
    claims = claims.filter(
      (c) =>
        c.candidate_scopes.some((x) => x.toLowerCase().includes(s)) ||
        c.anchors.some((a) => a.ref.toLowerCase().includes(s)),
    );
  }
  return ok({
    count: claims.length,
    claims: claims.map((c) => ({
      id: c.claim_id,
      text: c.text,
      support_level: c.support_level,
      scopes: c.candidate_scopes,
      anchors: c.anchors.map((a) => a.ref),
    })),
  });
}

// ── server wiring ───────────────────────────────────────────────────────────

function asMcp(r: ToolResult) {
  return {
    content: [{ type: "text" as const, text: r.text }],
    ...(r.isError ? { isError: true } : {}),
  };
}

export function buildMcpServer(root: string): McpServer {
  const server = new McpServer({ name: "claims-ledger-edt", version: "0.2.0" });

  server.registerTool(
    "ledger_search",
    {
      description:
        "Keyword search over the repo's Claims Ledger and the open trace — find anchored evidence BEFORE deciding.",
      inputSchema: {
        query: z.string().describe("search terms"),
        k: z.number().int().min(1).max(50).optional().describe("max results (default 5)"),
      },
    },
    async (args) => asMcp(handleLedgerSearch(root, args)),
  );

  server.registerTool(
    "trace_add_decision",
    {
      description:
        "Append an anchored decision to the open trace. Each anchor's quote MUST literally resolve at its ref — fabricated quotes are rejected.",
      inputSchema: {
        text: z.string().describe("the decision text"),
        kind: z.enum(["refactor", "behavior", "dependency", "config", "schema"]).optional(),
        anchors: z
          .array(
            z.object({
              ref: z.string().describe("anchor URI, e.g. git://sha/path#L1-L2 or doc://path#slug@sha"),
              quote: z.string().optional().describe("verbatim quote that must resolve at the ref"),
              confidence: z.enum(["high", "medium", "low"]).optional(),
            }),
          )
          .min(1),
      },
    },
    async (args) => asMcp(handleTraceAddDecision(root, args as AddDecisionArgs)),
  );

  server.registerTool(
    "trace_score",
    {
      description:
        "Run the cross-family judge panel over every decision⟷evidence pair in the open trace (median + spread>20 flagging). Skips gracefully without OPENROUTER_API_KEY.",
      inputSchema: {},
    },
    async () => asMcp(await handleTraceScore(root)),
  );

  server.registerTool(
    "anchor_verify",
    {
      description: "Freshness-check a single anchor ref (optionally with its quote) against the working tree.",
      inputSchema: {
        ref: z.string().describe("anchor URI"),
        quote: z.string().optional().describe("verbatim quote pinned to the anchor"),
      },
    },
    async (args) => asMcp(handleAnchorVerify(root, args)),
  );

  server.registerTool(
    "ledger_claims",
    {
      description:
        "List existing claims (optionally filtered by scope or path substring) so an agent knows which claims its diff might invalidate.",
      inputSchema: {
        scope: z.string().optional().describe("scope name or path substring filter"),
      },
    },
    async (args) => asMcp(handleLedgerClaims(root, args)),
  );

  return server;
}

export async function serveMcp(root: string): Promise<void> {
  const server = buildMcpServer(root);
  await server.connect(new StdioServerTransport());
  console.error(`claims-ledger-edt MCP server on stdio (root: ${root})`);
}
