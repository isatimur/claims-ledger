import type { PanelResult, SupportLevel } from "./types.js";

/**
 * Judge-panel merge — the median/spread-flag logic ported from the book's
 * `panel_merge.py` (median cancels a single model's calibration bias; big
 * disagreement flags the cell instead of averaging it away).
 *
 * The LLM calls themselves live behind `JudgePanel` (OpenRouter in production,
 * stubbed in tests / when no API key is configured). This module is pure.
 */

/** Two models disagreeing by more than this flags the decision for human review. */
export const DISAGREEMENT_THRESHOLD = 20;

/** Minimum models that must return a valid score to form a panel verdict. */
export const MIN_PANEL_VOTES = 2;

/** book-mash 4-band rubric — matches panel_merge.py::_label_for exactly. */
export function labelFor(score: number | null): "strong" | "moderate" | "weak" | "fail" | "error" {
  if (score === null) return "error";
  if (score >= 80) return "strong";
  if (score >= 50) return "moderate";
  if (score >= 20) return "weak";
  return "fail";
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Merge per-model scores into a panel verdict.
 * Returns null when fewer than MIN_PANEL_VOTES models produced a valid score
 * (the caller reports a panel error rather than a fabricated consensus).
 */
export function mergePanelScores(scores: (number | null)[]): PanelResult | null {
  const valid = scores.filter((s): s is number => s !== null && Number.isFinite(s));
  if (valid.length < MIN_PANEL_VOTES) return null;
  const med = median(valid);
  const spread = Math.max(...valid) - Math.min(...valid);
  return {
    scores: valid,
    median: Math.round(med * 10) / 10,
    spread: Math.round(spread * 10) / 10,
    flagged: spread > DISAGREEMENT_THRESHOLD,
  };
}

/** Map a panel median onto the ledger's support levels. */
export function supportFromPanel(panel: PanelResult | null): SupportLevel {
  if (!panel) return "tentative";
  if (panel.median >= 80) return "strong";
  if (panel.median >= 50) return "moderate";
  return "tentative";
}

// ── judge panel interface (OpenRouter wiring lands post-MVP) ────────────────

export interface JudgeScoreRequest {
  /** the claim or decision text */
  text: string;
  /** the anchored evidence quotes it must be entailed by */
  evidence: string[];
  /** "claim_defensibility" | "evidence_density" */
  dimension: string;
}

export interface JudgePanel {
  /** One score per model in the panel; null for a model that errored. */
  score(req: JudgeScoreRequest): Promise<(number | null)[]>;
  models: string[];
}

/** Default cross-family panel from the blueprint's action.yml. */
export const DEFAULT_JUDGE_MODELS = [
  "meta-llama/llama-3.3-70b",
  "qwen/qwen-2.5-72b",
  "deepseek/deepseek-chat",
];

/**
 * Stub panel used when no OpenRouter key is configured: refuses to score
 * (flag-don't-fabricate). `edt trace score` reports "scoring skipped" and
 * support levels stay anchor-derived.
 */
export class NullJudgePanel implements JudgePanel {
  models = DEFAULT_JUDGE_MODELS;
  async score(): Promise<(number | null)[]> {
    return this.models.map(() => null);
  }
}

/** Deterministic in-memory panel for tests. */
export class StaticJudgePanel implements JudgePanel {
  constructor(
    private readonly byText: Record<string, (number | null)[]>,
    public models: string[] = DEFAULT_JUDGE_MODELS,
  ) {}
  async score(req: JudgeScoreRequest): Promise<(number | null)[]> {
    return this.byText[req.text] ?? this.models.map(() => null);
  }
}
