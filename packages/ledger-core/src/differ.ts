import type { Claim, LedgerDiff, SupportLevel } from "./types.js";

/**
 * Ledger differ (blueprint §1.3 step ⑤): claim-set diff keyed on `claim_id`,
 * then per-claim anchor/support diff. Base = the ledger on the base branch,
 * head = the ledger in the PR.
 */

const SUPPORT_RANK: Record<SupportLevel, number> = { strong: 2, moderate: 1, tentative: 0 };

function anchorsEqual(a: Claim, b: Claim): boolean {
  if (a.anchors.length !== b.anchors.length) return false;
  return a.anchors.every((x, i) => {
    const y = b.anchors[i]!;
    return x.ref === y.ref && x.confidence === y.confidence && x.quote === y.quote;
  });
}

export function diffLedgers(base: Claim[], head: Claim[]): LedgerDiff {
  const baseById = new Map(base.map((c) => [c.claim_id, c]));
  const headById = new Map(head.map((c) => [c.claim_id, c]));

  const added = head.filter((c) => !baseById.has(c.claim_id));
  const removed = base.filter((c) => !headById.has(c.claim_id));
  const modified: LedgerDiff["modified"] = [];
  const downgraded: LedgerDiff["downgraded"] = [];

  for (const after of head) {
    const before = baseById.get(after.claim_id);
    if (!before) continue;
    if (
      before.text !== after.text ||
      before.support_level !== after.support_level ||
      !anchorsEqual(before, after)
    ) {
      modified.push({ before, after });
    }
    if (SUPPORT_RANK[after.support_level] < SUPPORT_RANK[before.support_level]) {
      downgraded.push({
        claim_id: after.claim_id,
        from: before.support_level,
        to: after.support_level,
      });
    }
  }

  return { added, removed, modified, downgraded };
}

export function diffSummary(diff: LedgerDiff): {
  added: number;
  modified: number;
  removed: number;
  downgraded: number;
} {
  return {
    added: diff.added.length,
    modified: diff.modified.length,
    removed: diff.removed.length,
    downgraded: diff.downgraded.length,
  };
}
