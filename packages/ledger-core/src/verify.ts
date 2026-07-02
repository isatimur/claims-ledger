import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnchorRef,
  AnchorVerification,
  Claim,
  Decision,
  VerifyReport,
} from "./types.js";
import { EXIT } from "./types.js";
import { headingSlug, parseAnchorRef } from "./anchors.js";
import { resolveQuote } from "./resolver.js";
import { FUZZY_THRESHOLD } from "./fuzzy.js";

/**
 * Anchor freshness verification against the current working tree
 * (blueprint §2.3: exact → fuzzy; below threshold ⇒ stale).
 *
 * Scheme semantics:
 *   git:// — the referenced file must exist in the tree and the quote must
 *            resolve in its current content (exact or fuzzy ≥ threshold).
 *   doc:// — the file must exist, the heading slug must still exist, and the
 *            quote (if any) must resolve within that heading's section.
 *   adr:// — an ADR file matching the id must exist under the ADR dir.
 *   yt://, ts:// — verified against a local transcripts dir when present;
 *            otherwise reported `unverifiable` (needs network — never gates).
 *   gh://  — requires the GitHub API; `unverifiable` offline (never gates).
 */

export interface VerifyOptions {
  /** repo root the anchors are resolved against */
  rootDir: string;
  fuzzyThreshold?: number;
  adrDir?: string; // default docs/adr
  transcriptsDir?: string; // default .ledger/transcripts
  /** restrict verification to anchors touching these paths (edt verify --only-touched) */
  onlyPaths?: string[];
}

function readIfExists(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

/** Extract the content of a markdown section whose heading slugs to `slug`. */
function sectionFor(content: string, slug: string): { text: string; startLine: number } | null {
  const lines = content.split("\n");
  const headings: { line: number; level: number; slug: string }[] = [];
  lines.forEach((l, i) => {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(l);
    if (m) headings.push({ line: i, level: m[1]!.length, slug: headingSlug(m[2]!) });
  });
  const idx = headings.findIndex((h) => h.slug === slug);
  if (idx < 0) return null;
  const start = headings[idx]!;
  const next = headings.slice(idx + 1).find((h) => h.level <= start.level);
  const endLine = next ? next.line : lines.length;
  return { text: lines.slice(start.line, endLine).join("\n"), startLine: start.line };
}

export function verifyAnchor(anchor: AnchorRef, opts: VerifyOptions): AnchorVerification {
  const threshold = opts.fuzzyThreshold ?? FUZZY_THRESHOLD;
  const parsed = parseAnchorRef(anchor.ref);
  const base: Omit<AnchorVerification, "status" | "detail"> = {
    ref: anchor.ref,
    scheme: anchor.scheme,
  };
  if (!parsed) {
    return { ...base, status: "stale", detail: "malformed anchor ref" };
  }

  switch (parsed.scheme) {
    case "git": {
      const filePath = path.join(opts.rootDir, parsed.path);
      const content = readIfExists(filePath);
      if (content === null) {
        return { ...base, status: "stale", detail: `file not found in working tree: ${parsed.path}` };
      }
      const lineCount = content.split("\n").length;
      if (!anchor.quote) {
        if (parsed.endLine > lineCount) {
          return {
            ...base,
            status: "stale",
            detail: `line range L${parsed.startLine}-L${parsed.endLine} exceeds file (${lineCount} lines) and no quote to re-resolve`,
          };
        }
        return { ...base, status: "fresh", detail: "file present, line range valid (no quote pinned)" };
      }
      const res = resolveQuote(anchor.quote, content, threshold);
      if (!res) {
        return {
          ...base,
          status: "stale",
          detail: `quote no longer resolves in ${parsed.path} (moved/deleted/reworded past fuzzy threshold ${threshold})`,
        };
      }
      return {
        ...base,
        status: "fresh",
        detail: `quote resolves (${res.method}, score ${res.score.toFixed(2)}) at ${parsed.path}#L${res.startLine + 1}-L${res.endLine + 1}`,
        resolved: {
          path: parsed.path,
          startLine: res.startLine + 1,
          endLine: res.endLine + 1,
          method: res.method,
        },
      };
    }

    case "doc": {
      const filePath = path.join(opts.rootDir, parsed.path);
      const content = readIfExists(filePath);
      if (content === null) {
        return { ...base, status: "stale", detail: `doc not found: ${parsed.path}` };
      }
      const section = sectionFor(content, parsed.headingSlug);
      if (!section) {
        return {
          ...base,
          status: "stale",
          detail: `heading #${parsed.headingSlug} no longer exists in ${parsed.path}`,
        };
      }
      if (anchor.quote) {
        const res = resolveQuote(anchor.quote, section.text, threshold);
        if (!res) {
          return {
            ...base,
            status: "stale",
            detail: `quote no longer resolves under #${parsed.headingSlug} in ${parsed.path}`,
          };
        }
        return {
          ...base,
          status: "fresh",
          detail: `quote resolves (${res.method}) under #${parsed.headingSlug}`,
          resolved: {
            path: parsed.path,
            startLine: section.startLine + res.startLine + 1,
            endLine: section.startLine + res.endLine + 1,
            method: res.method,
          },
        };
      }
      return { ...base, status: "fresh", detail: `heading #${parsed.headingSlug} present` };
    }

    case "adr": {
      const adrDir = path.join(opts.rootDir, opts.adrDir ?? "docs/adr");
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(adrDir);
      } catch {
        return { ...base, status: "stale", detail: `ADR directory not found: ${opts.adrDir ?? "docs/adr"}` };
      }
      const id = parsed.id.replace(/\.md$/, "");
      const hit = entries.find((e) => e === parsed.id || e.startsWith(id) || e.replace(/\.md$/, "") === id);
      if (!hit) {
        return { ...base, status: "stale", detail: `no ADR matching '${parsed.id}'` };
      }
      return { ...base, status: "fresh", detail: `ADR present: ${hit}` };
    }

    case "yt":
    case "ts": {
      const id = parsed.scheme === "yt" ? parsed.videoId : parsed.recordingId;
      const tDir = path.join(opts.rootDir, opts.transcriptsDir ?? ".ledger/transcripts");
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(tDir);
      } catch {
        return {
          ...base,
          status: "unverifiable",
          detail: `no local transcripts dir (${opts.transcriptsDir ?? ".ledger/transcripts"}); needs network`,
        };
      }
      const file = entries.find((e) => e.includes(id));
      if (!file) {
        return { ...base, status: "unverifiable", detail: `no local transcript for ${id}` };
      }
      if (anchor.quote) {
        const content = readIfExists(path.join(tDir, file));
        if (content && resolveQuote(anchor.quote, content, threshold)) {
          return { ...base, status: "fresh", detail: `quote resolves in transcript ${file}` };
        }
        return { ...base, status: "stale", detail: `quote not found in transcript ${file}` };
      }
      return { ...base, status: "fresh", detail: `transcript present: ${file}` };
    }

    case "gh":
      return { ...base, status: "unverifiable", detail: "gh:// anchors need the GitHub API (verified by the Action)" };
  }
}

/** True when an anchor's git/doc path is inside one of `paths`. */
function touches(anchor: AnchorRef, paths: string[]): boolean {
  const parsed = parseAnchorRef(anchor.ref);
  if (!parsed) return true;
  const p = parsed.scheme === "git" || parsed.scheme === "doc" ? parsed.path : null;
  if (!p) return false;
  return paths.some((t) => p === t || p.startsWith(t.endsWith("/") ? t : `${t}/`) || t === p);
}

/**
 * Verify every anchor across claims and/or trace decisions and compute the
 * gate exit code. Precedence when several conditions hold:
 * stale (11) > panel spread (12) > tentative (10). `unverifiable` never gates.
 */
export function verifyAll(
  items: { claims?: Claim[]; decisions?: Decision[] },
  opts: VerifyOptions,
): VerifyReport {
  const results: VerifyReport["results"] = [];
  let stale = 0;
  let fresh = 0;
  let unverifiable = 0;
  let tentative = 0;
  let flaggedSpread = 0;

  const owners: { owner: string; text: string; support: string; anchors: AnchorRef[]; spreadFlagged?: boolean }[] = [];
  for (const c of items.claims ?? []) {
    owners.push({ owner: c.claim_id, text: c.text, support: c.support_level, anchors: c.anchors });
  }
  for (const d of items.decisions ?? []) {
    owners.push({
      owner: d.decision_id,
      text: d.text,
      support: d.support_level,
      anchors: d.anchors,
      spreadFlagged: d.panel?.flagged ?? false,
    });
  }

  for (const o of owners) {
    if (o.support === "tentative" || o.anchors.length === 0) tentative++;
    if (o.spreadFlagged) flaggedSpread++;
    for (const a of o.anchors) {
      if (opts.onlyPaths && !touches(a, opts.onlyPaths)) continue;
      const v = verifyAnchor(a, opts);
      if (v.status === "fresh") fresh++;
      else if (v.status === "stale") stale++;
      else unverifiable++;
      results.push({ owner: o.owner, text: o.text, anchor: v });
    }
  }

  let exitCode: number = EXIT.OK;
  if (tentative > 0) exitCode = EXIT.TENTATIVE;
  if (flaggedSpread > 0) exitCode = EXIT.PANEL_SPREAD;
  if (stale > 0) exitCode = EXIT.STALE_ANCHOR;

  return { fresh, stale, unverifiable, tentative, flaggedSpread, results, exitCode };
}
