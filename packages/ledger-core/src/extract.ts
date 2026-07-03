import { resolveQuote } from "./resolver.js";
import type { Claim } from "./types.js";

/**
 * Claim extraction (blueprint §1.3 step ② EXTRACT): an LLM proposes claim
 * drafts from a diff hunk or doc section; each draft must carry a verbatim
 * quote copied from the provided text. The anti-fabrication resolver then
 * anchors the quote — a draft whose quote does not resolve is REJECTED, never
 * repaired. Drafts land as `support_level: tentative` proposals for a human
 * (or the judge panel) to promote; extraction never edits `.ledger/claims.md`.
 *
 * The LLM call itself is injected (`CompleteFn`) so this module stays pure and
 * testable without a key.
 */

export type CompleteFn = (prompt: string) => Promise<string | null>;

export interface ClaimDraft {
  text: string;
  quote: string;
  scopes?: string[];
}

export interface ExtractSource {
  /** repo-relative path the quote must resolve in */
  path: string;
  /** current content of the file (the quote must resolve HERE) */
  content: string;
  /** the hunk/section shown to the model (defaults to content) */
  excerpt?: string;
}

export interface ExtractResult {
  /** drafts whose quote resolved — anchored, tentative claims */
  accepted: Claim[];
  /** drafts dropped because the quote did not resolve (fabrication guard) */
  rejected: { draft: ClaimDraft; path: string }[];
  /** sources where the model returned nothing parseable */
  errors: string[];
}

export function extractPrompt(source: ExtractSource, existingClaims: string[]): string {
  const excerpt = source.excerpt ?? source.content;
  const existing =
    existingClaims.length > 0
      ? `\nClaims already in the ledger (do NOT re-propose these):\n${existingClaims
          .slice(0, 20)
          .map((t) => `- ${t}`)
          .join("\n")}\n`
      : "";
  return `You extract falsifiable claims from source text for a Claims Ledger.
A claim is a declarative statement that asserts something checkable about the
system or its behavior (not an opinion, not a heading, not boilerplate).

Rules:
- Propose at most 5 claims from the text below.
- Each claim MUST include "quote": a VERBATIM substring copied character-for-character
  from the text below. Do not paraphrase, trim words mid-sentence, or invent text.
  A quote that does not appear in the source will be rejected by a resolver.
- Prefer short, single-line quotes (the most load-bearing line).
- Skip text that yields no falsifiable claim. An empty list is a good answer.
${existing}
File: ${source.path}
Text:
<<<
${excerpt}
>>>

Respond with ONLY a JSON object:
{"claims": [{"text": "<claim>", "quote": "<verbatim substring>", "scopes": ["<area>"]}]}`;
}

/** Tolerant parse of the model reply: strict JSON, then fenced-JSON fallback. */
export function parseDraftsReply(content: string): ClaimDraft[] | null {
  const tryParse = (s: string): ClaimDraft[] | null => {
    try {
      const obj = JSON.parse(s) as { claims?: unknown };
      if (!Array.isArray(obj.claims)) return null;
      return obj.claims
        .filter(
          (c): c is ClaimDraft =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as ClaimDraft).text === "string" &&
            typeof (c as ClaimDraft).quote === "string" &&
            (c as ClaimDraft).text.trim().length > 0 &&
            (c as ClaimDraft).quote.trim().length > 0,
        )
        .map((c) => ({
          text: c.text.trim(),
          quote: c.quote,
          ...(Array.isArray(c.scopes) ? { scopes: c.scopes.filter((s) => typeof s === "string") } : {}),
        }));
    } catch {
      return null;
    }
  };
  const direct = tryParse(content);
  if (direct) return direct;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (fenced) return tryParse(fenced[1]!.trim());
  const brace = content.indexOf("{");
  if (brace >= 0) return tryParse(content.slice(brace, content.lastIndexOf("}") + 1));
  return null;
}

/**
 * Anchor a draft via the resolver cascade. Returns null when the quote does
 * not resolve in the source content — the anti-fabrication rejection.
 */
export function anchorDraft(
  draft: ClaimDraft,
  source: { path: string; content: string; sha: string },
  claimId: string,
  extractedBy: string,
): Claim | null {
  const res = resolveQuote(draft.quote, source.content);
  if (!res) return null;
  return {
    claim_id: claimId,
    text: draft.text,
    support_level: "tentative", // drafts start tentative; a human or the panel promotes
    candidate_scopes: draft.scopes ?? [],
    anchors: [
      {
        scheme: "git",
        ref: `git://${source.sha}/${source.path}#L${res.startLine + 1}-L${res.endLine + 1}`,
        confidence: res.method === "exact" ? "high" : "medium",
        quote: draft.quote,
      },
    ],
    provenance: { extracted_by: extractedBy },
  };
}

export interface ExtractOptions {
  sha: string;
  extractedBy: string;
  existingClaims?: string[];
  /** claim ids continue from here (e.g. current ledger max) */
  nextId?: number;
}

/** Run the extract → anchor pipeline over a set of sources. */
export async function extractClaims(
  sources: ExtractSource[],
  complete: CompleteFn,
  opts: ExtractOptions,
): Promise<ExtractResult> {
  const accepted: Claim[] = [];
  const rejected: { draft: ClaimDraft; path: string }[] = [];
  const errors: string[] = [];
  let next = opts.nextId ?? 1;

  for (const source of sources) {
    const reply = await complete(extractPrompt(source, opts.existingClaims ?? []));
    if (reply === null) {
      errors.push(`${source.path}: model call failed`);
      continue;
    }
    const drafts = parseDraftsReply(reply);
    if (drafts === null) {
      errors.push(`${source.path}: unparseable model reply`);
      continue;
    }
    for (const draft of drafts) {
      const claim = anchorDraft(
        draft,
        { path: source.path, content: source.content, sha: opts.sha },
        `claims#${next}`,
        opts.extractedBy,
      );
      if (claim) {
        accepted.push(claim);
        next++;
      } else {
        rejected.push({ draft, path: source.path });
      }
    }
  }
  return { accepted, rejected, errors };
}

/** Render accepted drafts as a proposals markdown file (same ledger grammar). */
export function renderProposedClaims(claims: Claim[], rejected: number): string {
  const lines: string[] = [
    "# Proposed claims (extract mode)",
    "",
    "> Drafts mined by the LLM extractor. Every quote below RESOLVED at its anchor",
    "> (fabricated quotes were rejected" + (rejected > 0 ? ` — ${rejected} dropped` : "") + ").",
    "> Review, then move keepers into `.ledger/claims.md` and set a support level.",
    "",
  ];
  for (const c of claims) {
    const n = c.claim_id.replace(/^claims#/, "");
    lines.push(`## ${n}) ${c.text}`);
    lines.push(`- **Support level:** ${c.support_level}`);
    if (c.candidate_scopes.length > 0) lines.push(`- **Scopes:** ${c.candidate_scopes.join(", ")}`);
    for (const a of c.anchors) {
      lines.push(`  - **Anchor:** \`${a.ref}\` · confidence: ${a.confidence}`);
      if (a.quote) lines.push(`    - **Quote:** "${a.quote}"`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
