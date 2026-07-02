import type { AnchorScheme, ParsedAnchor } from "./types.js";

/**
 * The six anchor schemes (blueprint §1.2):
 *
 *   yt://<video_id> <HH:MM:SS.mmm> → <HH:MM:SS.mmm>
 *   ts://<recording_id> <HH:MM:SS.mmm> → <HH:MM:SS.mmm>
 *   git://<sha>/<path>#L<start>-L<end>
 *   doc://<path>#<heading-slug>@<sha>          (@<sha> optional)
 *   adr://<id>@<sha>                           (@<sha> optional)
 *   gh://issues/<n>#comment-<id>               (also discussions/, pull/)
 *
 * The timestamp grammar (HH:MM:SS.mmm, "→" or "->"/"-->") is byte-compatible
 * with the book's anchor regex in build_evidence.py.
 */

const TS = String.raw`\d\d:\d\d:\d\d\.\d\d\d`;
const ARROW = String.raw`(?:→|-{1,2}>)`;

const YT_RE = new RegExp(`^yt://([A-Za-z0-9_-]{11})\\s+(${TS})\\s*${ARROW}\\s*(${TS})$`);
const TS_RE = new RegExp(`^ts://([A-Za-z0-9._-]+)\\s+(${TS})\\s*${ARROW}\\s*(${TS})$`);
const GIT_RE = /^git:\/\/([0-9a-f]{7,40})\/(.+?)#L(\d+)-L(\d+)$/;
const DOC_RE = /^doc:\/\/(.+?)#([^@#]+)(?:@([0-9a-f]{7,40}))?$/;
const ADR_RE = /^adr:\/\/([^@]+?)(?:@([0-9a-f]{7,40}))?$/;
const GH_RE = /^gh:\/\/(issues|discussions|pull)\/(\d+)(?:#comment-(\d+))?$/;

/** Convert HH:MM:SS.mmm to whole seconds — identical truncation to build_evidence.py's _to_seconds. */
export function toSeconds(ts: string): number {
  const [h, m, s] = ts.split(":") as [string, string, string];
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + Math.trunc(parseFloat(s));
}

export function schemeOf(ref: string): AnchorScheme | null {
  const m = /^([a-z]+):\/\//.exec(ref);
  if (!m) return null;
  const s = m[1];
  return s === "yt" || s === "ts" || s === "git" || s === "doc" || s === "adr" || s === "gh"
    ? s
    : null;
}

/** Parse a canonical anchor URI into scheme-specific components. Returns null on malformed refs. */
export function parseAnchorRef(ref: string): ParsedAnchor | null {
  let m: RegExpExecArray | null;
  if ((m = YT_RE.exec(ref))) {
    return { scheme: "yt", videoId: m[1]!, start: m[2]!, end: m[3]! };
  }
  if ((m = TS_RE.exec(ref))) {
    return { scheme: "ts", recordingId: m[1]!, start: m[2]!, end: m[3]! };
  }
  if ((m = GIT_RE.exec(ref))) {
    return {
      scheme: "git",
      sha: m[1]!,
      path: m[2]!,
      startLine: parseInt(m[3]!, 10),
      endLine: parseInt(m[4]!, 10),
    };
  }
  if ((m = DOC_RE.exec(ref))) {
    return { scheme: "doc", path: m[1]!, headingSlug: m[2]!, sha: m[3] ?? undefined };
  }
  if ((m = GH_RE.exec(ref))) {
    return {
      scheme: "gh",
      kind: m[1] as "issues" | "discussions" | "pull",
      number: parseInt(m[2]!, 10),
      commentId: m[3] ?? undefined,
    };
  }
  if ((m = ADR_RE.exec(ref))) {
    return { scheme: "adr", id: m[1]!, sha: m[2] ?? undefined };
  }
  return null;
}

/** Format scheme-specific components back into the canonical URI. Inverse of parseAnchorRef. */
export function formatAnchorRef(a: ParsedAnchor): string {
  switch (a.scheme) {
    case "yt":
      return `yt://${a.videoId} ${a.start} → ${a.end}`;
    case "ts":
      return `ts://${a.recordingId} ${a.start} → ${a.end}`;
    case "git":
      return `git://${a.sha}/${a.path}#L${a.startLine}-L${a.endLine}`;
    case "doc":
      return `doc://${a.path}#${a.headingSlug}${a.sha ? `@${a.sha}` : ""}`;
    case "adr":
      return `adr://${a.id}${a.sha ? `@${a.sha}` : ""}`;
    case "gh":
      return `gh://${a.kind}/${a.number}${a.commentId ? `#comment-${a.commentId}` : ""}`;
  }
}

/** GitHub-style heading slug (lowercase, spaces → dashes, punctuation stripped). */
export function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}
