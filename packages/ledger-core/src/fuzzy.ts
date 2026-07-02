/**
 * Lightweight fuzzy matching for the resolver cascade (exact → fuzzy → embed).
 * Embeddings are deliberately out of scope for the MVP (blueprint Phase 1 uses
 * sqlite-vec later); this module provides the rapidfuzz-style ratio the
 * blueprint's 0.87 threshold was specified against.
 */

/** Levenshtein distance, two-row DP. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Normalized similarity ratio in [0, 1] — 1 means identical. */
export function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface FuzzyHit {
  /** 0-based start line of the best window */
  line: number;
  /** number of lines in the window */
  span: number;
  score: number;
}

/** Default fuzzy threshold from the blueprint (rapidfuzz, threshold 0.87). */
export const FUZZY_THRESHOLD = 0.87;

/**
 * Find the best window of `content` lines matching `needle`.
 * Windows are sized to the needle's own line count (±1) so multi-line quotes
 * resolve; comparison is whitespace-normalized.
 */
export function bestWindow(needle: string, content: string): FuzzyHit | null {
  const target = normalizeWs(needle);
  if (!target) return null;
  const lines = content.split("\n");
  const needleLines = Math.max(1, needle.split("\n").length);
  let best: FuzzyHit | null = null;
  for (const span of new Set([needleLines, needleLines + 1, Math.max(1, needleLines - 1)])) {
    for (let i = 0; i + span <= lines.length; i++) {
      const window = normalizeWs(lines.slice(i, i + span).join(" "));
      if (!window) continue;
      // cheap containment shortcut before paying for Levenshtein
      const score = window.includes(target) ? 1 : ratio(target, window);
      if (!best || score > best.score) best = { line: i, span, score };
      if (best.score === 1) return best;
    }
  }
  return best;
}
