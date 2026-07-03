/**
 * Core data model for Claims-Ledger-as-a-Service.
 *
 * The markdown ledger (`.ledger/claims.md`) is the source of truth; the JSON
 * shapes below are deterministic build artifacts — the same dual-artifact
 * pattern as the book's `Claims Ledger.md` → `evidence.json`.
 */

export type SupportLevel = "strong" | "moderate" | "tentative";
export type Confidence = "high" | "medium" | "low";
export type AnchorScheme = "yt" | "ts" | "git" | "doc" | "adr" | "gh";
export type FreshnessStatus = "fresh" | "stale" | "unverifiable";

/** A parsed anchor reference. `ref` is the canonical URI form. */
export interface AnchorRef {
  scheme: AnchorScheme;
  ref: string;
  confidence: Confidence;
  label?: string;
  quote?: string;
  /** yt:// and ts:// convenience field (unchanged from the book schema). */
  start_seconds?: number;
  freshness?: { verified_at: string; status: FreshnessStatus; detail?: string };
}

/** Scheme-specific parsed components of an anchor URI. */
export type ParsedAnchor =
  | { scheme: "yt"; videoId: string; start: string; end: string }
  | { scheme: "ts"; recordingId: string; start: string; end: string }
  | { scheme: "git"; sha: string; path: string; startLine: number; endLine: number }
  | { scheme: "doc"; path: string; headingSlug: string; sha?: string }
  | { scheme: "adr"; id: string; sha?: string }
  | { scheme: "gh"; kind: "issues" | "discussions" | "pull"; number: number; commentId?: string };

/** One entry of `.ledger/ledger.json` (v1) — a direct superset of the book's evidence.json object. */
export interface Claim {
  claim_id: string; // "claims#17"
  text: string;
  support_level: SupportLevel;
  candidate_scopes: string[];
  anchors: AnchorRef[];
  caveats?: string;
  provenance?: { extracted_by: string; pr?: number; run_id?: string };
}

/** Book-compatible parse output for yt:// anchors (matches build_evidence.py byte-for-byte). */
export interface BookAnchor {
  video_id: string;
  start: string;
  end: string;
  start_seconds: number;
  confidence: string;
  label: string;
  quote?: string;
}

export interface BookClaim {
  claim_id: string;
  text: string;
  support_level: string;
  candidate_chapters: number[];
  anchors: BookAnchor[];
}

// ── trace-v1 ────────────────────────────────────────────────────────────────

export type DecisionKind = "refactor" | "behavior" | "dependency" | "config" | "schema";

export interface PanelResult {
  scores: number[];
  median: number;
  spread: number;
  flagged: boolean;
}

export interface Decision {
  decision_id: string; // "edt#1"
  text: string;
  kind: DecisionKind;
  support_level: SupportLevel;
  anchors: AnchorRef[];
  /** claim_defensibility panel — drives support_level */
  panel?: PanelResult;
  /** evidence_density panel — reported, never gates on its own */
  panel_evidence?: PanelResult;
  regression_risk?: { level: "low" | "medium" | "high"; basis: string };
}

export interface Trace {
  $schema: "https://claims-ledger.dev/schemas/trace-v1.json";
  trace_id: string;
  agent?: { name: string; version?: string; session?: string };
  branch: string;
  pr?: number;
  decisions: Decision[];
  summary: {
    decisions: number;
    strong: number;
    moderate: number;
    tentative: number;
    stale_anchors: number;
  };
}

// ── verify / gate ───────────────────────────────────────────────────────────

/**
 * Exit codes for `edt verify --gate` (blueprint §2.2).
 * 2 is "internal error" and never gates.
 */
export const EXIT = {
  OK: 0,
  TENTATIVE: 10,
  STALE_ANCHOR: 11,
  PANEL_SPREAD: 12,
  TRACE_MISSING: 13,
  INTERNAL_ERROR: 2,
} as const;

export interface AnchorVerification {
  ref: string;
  scheme: AnchorScheme;
  status: FreshnessStatus;
  detail: string;
  /** matched line range in the current working tree, when re-resolved */
  resolved?: { path: string; startLine: number; endLine: number; method: "exact" | "fuzzy" };
}

export interface VerifyReport {
  fresh: number;
  stale: number;
  unverifiable: number;
  tentative: number;
  flaggedSpread: number;
  results: { owner: string; text: string; anchor: AnchorVerification }[];
  exitCode: number;
}

// ── differ ──────────────────────────────────────────────────────────────────

export interface LedgerDiff {
  added: Claim[];
  removed: Claim[];
  modified: { before: Claim; after: Claim }[];
  downgraded: { claim_id: string; from: SupportLevel; to: SupportLevel }[];
}
