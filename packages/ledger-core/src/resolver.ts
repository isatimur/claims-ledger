import { bestWindow, FUZZY_THRESHOLD, normalizeWs } from "./fuzzy.js";

/**
 * The resolver cascade (blueprint §1.3): exact string match → fuzzy match.
 * The embedding stage is intentionally skipped in the MVP; `method` leaves
 * room for `"embedding"` when the sqlite-vec index lands.
 */

export interface Resolution {
  /** 0-based line range in the target content */
  startLine: number;
  endLine: number;
  method: "exact" | "fuzzy";
  score: number;
}

/**
 * Resolve a verbatim quote inside file content.
 *
 * This is the anti-fabrication primitive: an anchor is only accepted when the
 * quote literally (or ≥ threshold fuzzily) resolves in the referenced source.
 * An LLM can hallucinate a justification; it cannot hallucinate a string into
 * a commit.
 */
export function resolveQuote(
  quote: string,
  content: string,
  threshold: number = FUZZY_THRESHOLD,
): Resolution | null {
  // 1. exact — raw substring
  const rawIdx = content.indexOf(quote);
  if (rawIdx >= 0) {
    const startLine = content.slice(0, rawIdx).split("\n").length - 1;
    const endLine = startLine + quote.split("\n").length - 1;
    return { startLine, endLine, method: "exact", score: 1 };
  }

  // 2. exact — whitespace-normalized, line-window search
  //    (also catches quotes that were re-wrapped across lines)
  const hit = bestWindow(quote, content);
  if (!hit) return null;
  if (hit.score === 1) {
    return { startLine: hit.line, endLine: hit.line + hit.span - 1, method: "exact", score: 1 };
  }

  // 3. fuzzy — accept when the best window clears the threshold
  if (hit.score >= threshold) {
    return {
      startLine: hit.line,
      endLine: hit.line + hit.span - 1,
      method: "fuzzy",
      score: hit.score,
    };
  }
  return null;
}

/** True when two strings match after whitespace normalization. */
export function quotesEquivalent(a: string, b: string): boolean {
  return normalizeWs(a) === normalizeWs(b);
}
