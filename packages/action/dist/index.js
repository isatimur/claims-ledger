import{createRequire}from'node:module';const require=createRequire(import.meta.url);

// src/main.ts
import * as fs3 from "node:fs";

// src/run.ts
import * as fs2 from "node:fs";
import * as path3 from "node:path";
import { execFileSync } from "node:child_process";

// ../ledger-core/dist/types.js
var EXIT = {
  OK: 0,
  TENTATIVE: 10,
  STALE_ANCHOR: 11,
  PANEL_SPREAD: 12,
  TRACE_MISSING: 13,
  INTERNAL_ERROR: 2
};

// ../ledger-core/dist/anchors.js
var TS = String.raw`\d\d:\d\d:\d\d\.\d\d\d`;
var ARROW = String.raw`(?:→|-{1,2}>)`;
var YT_RE = new RegExp(`^yt://([A-Za-z0-9_-]{11})\\s+(${TS})\\s*${ARROW}\\s*(${TS})$`);
var TS_RE = new RegExp(`^ts://([A-Za-z0-9._-]+)\\s+(${TS})\\s*${ARROW}\\s*(${TS})$`);
var GIT_RE = /^git:\/\/([0-9a-f]{7,40})\/(.+?)#L(\d+)-L(\d+)$/;
var DOC_RE = /^doc:\/\/(.+?)#([^@#]+)(?:@([0-9a-f]{7,40}))?$/;
var ADR_RE = /^adr:\/\/([^@]+?)(?:@([0-9a-f]{7,40}))?$/;
var GH_RE = /^gh:\/\/(issues|discussions|pull)\/(\d+)(?:#comment-(\d+))?$/;
function toSeconds(ts) {
  const [h, m, s] = ts.split(":");
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + Math.trunc(parseFloat(s));
}
function schemeOf(ref) {
  const m = /^([a-z]+):\/\//.exec(ref);
  if (!m)
    return null;
  const s = m[1];
  return s === "yt" || s === "ts" || s === "git" || s === "doc" || s === "adr" || s === "gh" ? s : null;
}
function parseAnchorRef(ref) {
  let m;
  if (m = YT_RE.exec(ref)) {
    return { scheme: "yt", videoId: m[1], start: m[2], end: m[3] };
  }
  if (m = TS_RE.exec(ref)) {
    return { scheme: "ts", recordingId: m[1], start: m[2], end: m[3] };
  }
  if (m = GIT_RE.exec(ref)) {
    return {
      scheme: "git",
      sha: m[1],
      path: m[2],
      startLine: parseInt(m[3], 10),
      endLine: parseInt(m[4], 10)
    };
  }
  if (m = DOC_RE.exec(ref)) {
    return { scheme: "doc", path: m[1], headingSlug: m[2], sha: m[3] ?? void 0 };
  }
  if (m = GH_RE.exec(ref)) {
    return {
      scheme: "gh",
      kind: m[1],
      number: parseInt(m[2], 10),
      commentId: m[3] ?? void 0
    };
  }
  if (m = ADR_RE.exec(ref)) {
    return { scheme: "adr", id: m[1], sha: m[2] ?? void 0 };
  }
  return null;
}
function headingSlug(heading) {
  return heading.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

// ../ledger-core/dist/parser.js
var CLAIM_RE = /^##\s+(\d+)\)\s+(.+?)\s*$/gm;
var SUPPORT_RE = /\*\*Support level:\*\*\s*([A-Za-z]+)/;
var CANDIDATE_RE = /\*\*Candidate chapters:\*\*\s*([0-9,\s]+)/;
var SCOPES_RE = /\*\*(?:Candidate scopes|Scopes):\*\*\s*(.+)$/m;
var CAVEATS_RE = /\*\*Caveats(?: \/ counterpoints)?:\*\*\s*(.+)$/m;
var BOOK_ANCHOR_RE = new RegExp(String.raw`\*\*Anchor:\*\*\s*` + "`([A-Za-z0-9_-]{11})`" + String.raw`\s*(\d\d:\d\d:\d\d\.\d\d\d)\s*(?:→|-{1,2}>)\s*(\d\d:\d\d:\d\d\.\d\d\d)` + String.raw`.*?confidence:\s*(\w+)`);
var URI_ANCHOR_RE = /\*\*Anchor:\*\*\s*`([a-z]+:\/\/[^`]+)`(?:.*?confidence:\s*(\w+))?/;
var QUOTE_RE = /\*\*Quote:\*\*\s*"(.+)"\s*$/;
var LABEL_BULLET_RE = /^\s*-\s+(?:\[\[([^\]]+)\]\]|\*\*Source:\*\*\s*(.+?)\s*$)/;
function* claimBlocks(text) {
  const matches = [...text.matchAll(CLAIM_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    yield {
      number: m[1],
      text: m[2].trim(),
      body: text.slice(m.index + m[0].length, end)
    };
  }
}
function bulletLabel(inner) {
  return inner.includes("|") ? inner.slice(inner.indexOf("|") + 1).trim() : inner.trim();
}
function normalizeConfidence(raw) {
  const c = (raw ?? "medium").toLowerCase();
  return c === "high" || c === "low" ? c : "medium";
}
function normalizeSupport(raw) {
  const s = (raw ?? "moderate").toLowerCase();
  return s === "strong" || s === "tentative" ? s : "moderate";
}
function parseLedger(text) {
  const claims = [];
  for (const { number, text: claimText, body } of claimBlocks(text)) {
    const support = SUPPORT_RE.exec(body);
    const chapters = CANDIDATE_RE.exec(body);
    const scopes = SCOPES_RE.exec(body);
    const caveats = CAVEATS_RE.exec(body);
    const candidate_scopes = chapters ? [...chapters[1].matchAll(/\d+/g)].map((n) => n[0]) : scopes ? scopes[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const anchors = [];
    let currentLabel = "";
    let pending = null;
    const flush = () => {
      if (pending)
        anchors.push(pending);
      pending = null;
    };
    for (const line of body.split("\n")) {
      const lb = LABEL_BULLET_RE.exec(line);
      if (lb)
        currentLabel = lb[1] ? bulletLabel(lb[1]) : (lb[2] ?? "").trim();
      const book = BOOK_ANCHOR_RE.exec(line);
      const uri = book ? null : URI_ANCHOR_RE.exec(line);
      if (book) {
        flush();
        pending = {
          scheme: "yt",
          ref: `yt://${book[1]} ${book[2]} \u2192 ${book[3]}`,
          start_seconds: toSeconds(book[2]),
          confidence: normalizeConfidence(book[4]),
          label: currentLabel || void 0
        };
        continue;
      }
      if (uri) {
        const ref = uri[1].trim();
        const scheme = schemeOf(ref);
        if (scheme && parseAnchorRef(ref)) {
          flush();
          const parsed = parseAnchorRef(ref);
          pending = {
            scheme,
            ref,
            confidence: normalizeConfidence(uri[2]),
            label: currentLabel || void 0,
            ...parsed.scheme === "yt" || parsed.scheme === "ts" ? { start_seconds: toSeconds(parsed.start) } : {}
          };
        }
        continue;
      }
      const q = QUOTE_RE.exec(line);
      if (q && pending) {
        pending.quote = q[1];
        flush();
      }
    }
    flush();
    if (anchors.length > 0) {
      claims.push({
        claim_id: `claims#${number}`,
        text: claimText,
        support_level: normalizeSupport(support?.[1]),
        candidate_scopes,
        anchors,
        ...caveats ? { caveats: caveats[1].trim() } : {}
      });
    }
  }
  return claims;
}

// ../ledger-core/dist/fuzzy.js
function levenshtein(a, b) {
  if (a === b)
    return 0;
  if (a.length === 0)
    return b.length;
  if (b.length === 0)
    return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++)
    prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
function ratio(a, b) {
  const max = Math.max(a.length, b.length);
  if (max === 0)
    return 1;
  return 1 - levenshtein(a, b) / max;
}
function normalizeWs(s) {
  return s.replace(/\s+/g, " ").trim();
}
var FUZZY_THRESHOLD = 0.87;
function bestWindow(needle, content) {
  const target = normalizeWs(needle);
  if (!target)
    return null;
  const lines = content.split("\n");
  const needleLines = Math.max(1, needle.split("\n").length);
  let best = null;
  for (const span of /* @__PURE__ */ new Set([needleLines, needleLines + 1, Math.max(1, needleLines - 1)])) {
    for (let i = 0; i + span <= lines.length; i++) {
      const window = normalizeWs(lines.slice(i, i + span).join(" "));
      if (!window)
        continue;
      const score = window.includes(target) ? 1 : ratio(target, window);
      if (!best || score > best.score)
        best = { line: i, span, score };
      if (best.score === 1)
        return best;
    }
  }
  return best;
}

// ../ledger-core/dist/resolver.js
function resolveQuote(quote, content, threshold = FUZZY_THRESHOLD) {
  const rawIdx = content.indexOf(quote);
  if (rawIdx >= 0) {
    const startLine = content.slice(0, rawIdx).split("\n").length - 1;
    const endLine = startLine + quote.split("\n").length - 1;
    return { startLine, endLine, method: "exact", score: 1 };
  }
  const hit = bestWindow(quote, content);
  if (!hit)
    return null;
  if (hit.score === 1) {
    return { startLine: hit.line, endLine: hit.line + hit.span - 1, method: "exact", score: 1 };
  }
  if (hit.score >= threshold) {
    return {
      startLine: hit.line,
      endLine: hit.line + hit.span - 1,
      method: "fuzzy",
      score: hit.score
    };
  }
  return null;
}

// ../ledger-core/dist/verify.js
import * as fs from "node:fs";
import * as path from "node:path";
function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}
function sectionFor(content, slug) {
  const lines = content.split("\n");
  const headings = [];
  lines.forEach((l, i) => {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(l);
    if (m)
      headings.push({ line: i, level: m[1].length, slug: headingSlug(m[2]) });
  });
  const idx = headings.findIndex((h) => h.slug === slug);
  if (idx < 0)
    return null;
  const start = headings[idx];
  const next = headings.slice(idx + 1).find((h) => h.level <= start.level);
  const endLine = next ? next.line : lines.length;
  return { text: lines.slice(start.line, endLine).join("\n"), startLine: start.line };
}
function verifyAnchor(anchor, opts) {
  const threshold = opts.fuzzyThreshold ?? FUZZY_THRESHOLD;
  const parsed = parseAnchorRef(anchor.ref);
  const base = {
    ref: anchor.ref,
    scheme: anchor.scheme
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
            detail: `line range L${parsed.startLine}-L${parsed.endLine} exceeds file (${lineCount} lines) and no quote to re-resolve`
          };
        }
        return { ...base, status: "fresh", detail: "file present, line range valid (no quote pinned)" };
      }
      const res = resolveQuote(anchor.quote, content, threshold);
      if (!res) {
        return {
          ...base,
          status: "stale",
          detail: `quote no longer resolves in ${parsed.path} (moved/deleted/reworded past fuzzy threshold ${threshold})`
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
          method: res.method
        }
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
          detail: `heading #${parsed.headingSlug} no longer exists in ${parsed.path}`
        };
      }
      if (anchor.quote) {
        const res = resolveQuote(anchor.quote, section.text, threshold);
        if (!res) {
          return {
            ...base,
            status: "stale",
            detail: `quote no longer resolves under #${parsed.headingSlug} in ${parsed.path}`
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
            method: res.method
          }
        };
      }
      return { ...base, status: "fresh", detail: `heading #${parsed.headingSlug} present` };
    }
    case "adr": {
      const adrDir = path.join(opts.rootDir, opts.adrDir ?? "docs/adr");
      let entries = [];
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
      let entries = [];
      try {
        entries = fs.readdirSync(tDir);
      } catch {
        return {
          ...base,
          status: "unverifiable",
          detail: `no local transcripts dir (${opts.transcriptsDir ?? ".ledger/transcripts"}); needs network`
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
function touches(anchor, paths) {
  const parsed = parseAnchorRef(anchor.ref);
  if (!parsed)
    return true;
  const p = parsed.scheme === "git" || parsed.scheme === "doc" ? parsed.path : null;
  if (!p)
    return false;
  return paths.some((t) => p === t || p.startsWith(t.endsWith("/") ? t : `${t}/`) || t === p);
}
function verifyAll(items, opts) {
  const results = [];
  let stale = 0;
  let fresh = 0;
  let unverifiable = 0;
  let tentative = 0;
  let flaggedSpread = 0;
  const owners = [];
  for (const c of items.claims ?? []) {
    owners.push({ owner: c.claim_id, text: c.text, support: c.support_level, anchors: c.anchors });
  }
  for (const d of items.decisions ?? []) {
    owners.push({
      owner: d.decision_id,
      text: d.text,
      support: d.support_level,
      anchors: d.anchors,
      spreadFlagged: d.panel?.flagged ?? false
    });
  }
  for (const o of owners) {
    if (o.support === "tentative" || o.anchors.length === 0)
      tentative++;
    if (o.spreadFlagged)
      flaggedSpread++;
    for (const a of o.anchors) {
      if (opts.onlyPaths && !touches(a, opts.onlyPaths))
        continue;
      const v = verifyAnchor(a, opts);
      if (v.status === "fresh")
        fresh++;
      else if (v.status === "stale")
        stale++;
      else
        unverifiable++;
      results.push({ owner: o.owner, text: o.text, anchor: v });
    }
  }
  let exitCode = EXIT.OK;
  if (tentative > 0)
    exitCode = EXIT.TENTATIVE;
  if (flaggedSpread > 0)
    exitCode = EXIT.PANEL_SPREAD;
  if (stale > 0)
    exitCode = EXIT.STALE_ANCHOR;
  return { fresh, stale, unverifiable, tentative, flaggedSpread, results, exitCode };
}

// ../ledger-core/dist/differ.js
var SUPPORT_RANK = { strong: 2, moderate: 1, tentative: 0 };
function anchorsEqual(a, b) {
  if (a.anchors.length !== b.anchors.length)
    return false;
  return a.anchors.every((x, i) => {
    const y = b.anchors[i];
    return x.ref === y.ref && x.confidence === y.confidence && x.quote === y.quote;
  });
}
function diffLedgers(base, head) {
  const baseById = new Map(base.map((c) => [c.claim_id, c]));
  const headById = new Map(head.map((c) => [c.claim_id, c]));
  const added = head.filter((c) => !baseById.has(c.claim_id));
  const removed = base.filter((c) => !headById.has(c.claim_id));
  const modified = [];
  const downgraded = [];
  for (const after of head) {
    const before = baseById.get(after.claim_id);
    if (!before)
      continue;
    if (before.text !== after.text || before.support_level !== after.support_level || !anchorsEqual(before, after)) {
      modified.push({ before, after });
    }
    if (SUPPORT_RANK[after.support_level] < SUPPORT_RANK[before.support_level]) {
      downgraded.push({
        claim_id: after.claim_id,
        from: before.support_level,
        to: after.support_level
      });
    }
  }
  return { added, removed, modified, downgraded };
}

// ../ledger-core/dist/extract.js
function extractPrompt(source, existingClaims) {
  const excerpt = source.excerpt ?? source.content;
  const existing = existingClaims.length > 0 ? `
Claims already in the ledger (do NOT re-propose these):
${existingClaims.slice(0, 20).map((t) => `- ${t}`).join("\n")}
` : "";
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
function parseDraftsReply(content) {
  const tryParse = (s) => {
    try {
      const obj = JSON.parse(s);
      if (!Array.isArray(obj.claims))
        return null;
      return obj.claims.filter((c) => typeof c === "object" && c !== null && typeof c.text === "string" && typeof c.quote === "string" && c.text.trim().length > 0 && c.quote.trim().length > 0).map((c) => ({
        text: c.text.trim(),
        quote: c.quote,
        ...Array.isArray(c.scopes) ? { scopes: c.scopes.filter((s2) => typeof s2 === "string") } : {}
      }));
    } catch {
      return null;
    }
  };
  const direct = tryParse(content);
  if (direct)
    return direct;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (fenced)
    return tryParse(fenced[1].trim());
  const brace = content.indexOf("{");
  if (brace >= 0)
    return tryParse(content.slice(brace, content.lastIndexOf("}") + 1));
  return null;
}
function anchorDraft(draft, source, claimId, extractedBy) {
  const res = resolveQuote(draft.quote, source.content);
  if (!res)
    return null;
  return {
    claim_id: claimId,
    text: draft.text,
    support_level: "tentative",
    // drafts start tentative; a human or the panel promotes
    candidate_scopes: draft.scopes ?? [],
    anchors: [
      {
        scheme: "git",
        ref: `git://${source.sha}/${source.path}#L${res.startLine + 1}-L${res.endLine + 1}`,
        confidence: res.method === "exact" ? "high" : "medium",
        quote: draft.quote
      }
    ],
    provenance: { extracted_by: extractedBy }
  };
}
async function extractClaims(sources, complete, opts) {
  const accepted = [];
  const rejected = [];
  const errors = [];
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
      const claim = anchorDraft(draft, { path: source.path, content: source.content, sha: opts.sha }, `claims#${next}`, opts.extractedBy);
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
function renderProposedClaims(claims, rejected) {
  const lines = [
    "# Proposed claims (extract mode)",
    "",
    "> Drafts mined by the LLM extractor. Every quote below RESOLVED at its anchor",
    "> (fabricated quotes were rejected" + (rejected > 0 ? ` \u2014 ${rejected} dropped` : "") + ").",
    "> Review, then move keepers into `.ledger/claims.md` and set a support level.",
    ""
  ];
  for (const c of claims) {
    const n = c.claim_id.replace(/^claims#/, "");
    lines.push(`## ${n}) ${c.text}`);
    lines.push(`- **Support level:** ${c.support_level}`);
    if (c.candidate_scopes.length > 0)
      lines.push(`- **Scopes:** ${c.candidate_scopes.join(", ")}`);
    for (const a of c.anchors) {
      lines.push(`  - **Anchor:** \`${a.ref}\` \xB7 confidence: ${a.confidence}`);
      if (a.quote)
        lines.push(`    - **Quote:** "${a.quote}"`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ../ledger-core/dist/badge.js
function buildBadge(claimCount, report) {
  const verifiable = report.fresh + report.stale;
  let message;
  let color;
  if (report.stale > 0) {
    message = `${claimCount} anchored \xB7 ${report.fresh}/${verifiable} fresh \xB7 ${report.stale} stale`;
    color = "red";
  } else if (verifiable > 0) {
    message = `${claimCount} anchored \xB7 ${report.fresh}/${verifiable} fresh`;
    color = "brightgreen";
  } else if (report.unverifiable > 0) {
    message = `${claimCount} anchored \xB7 ${report.unverifiable} unverifiable offline`;
    color = "orange";
  } else {
    message = "no claims yet";
    color = "lightgrey";
  }
  return { schemaVersion: 1, label: "claims", message, color, cacheSeconds: 3600 };
}

// ../ledger-core/dist/report.js
function claimLine(c) {
  const out = [`### ${c.claim_id} \u2014 ${c.text}  [${c.support_level}]`];
  for (const a of c.anchors) {
    out.push(`- Anchor: \`${a.ref}\` \xB7 confidence: ${a.confidence}`);
    if (a.quote)
      out.push(`  - Quote: "${a.quote}"`);
  }
  return out;
}
function renderLedgerReport(diff, verify, ctx) {
  const header = ctx.pr != null ? `# Ledger diff \u2014 PR #${ctx.pr} (${ctx.headSha ?? "HEAD"} vs ${ctx.baseRef ?? "base"})` : `# Ledger report (${ctx.headSha ?? "HEAD"})`;
  const totalAnchors = verify.fresh + verify.stale + verify.unverifiable;
  const lines = [
    header,
    "",
    `**${ctx.baseCount} claims \u2192 ${ctx.headCount} claims** \xB7 +${diff.added.length} added \xB7 ${diff.modified.length} modified \xB7 ${diff.removed.length} removed` + (verify.stale > 0 ? ` \xB7 \u26A0 ${verify.stale} stale anchor${verify.stale === 1 ? "" : "s"}` : ""),
    "",
    `Anchors verified: ${verify.fresh}/${totalAnchors} fresh` + (verify.unverifiable > 0 ? ` (${verify.unverifiable} unverifiable offline)` : "")
  ];
  if (diff.added.length > 0) {
    lines.push("", "## Added");
    for (const c of diff.added)
      lines.push(...claimLine(c), "");
  }
  if (diff.modified.length > 0) {
    lines.push("", "## Modified");
    for (const { after } of diff.modified)
      lines.push(...claimLine(after), "");
  }
  if (diff.removed.length > 0) {
    lines.push("", "## Removed");
    for (const c of diff.removed)
      lines.push(`- ${c.claim_id} \u2014 ${c.text}`);
  }
  if (diff.downgraded.length > 0) {
    lines.push("", "## Downgraded");
    for (const d of diff.downgraded) {
      lines.push(`- ${d.claim_id}  [${d.from} \u2192 ${d.to}]`);
    }
  }
  const stale = verify.results.filter((r) => r.anchor.status === "stale");
  if (stale.length > 0) {
    lines.push("", "## Stale \u26A0");
    for (const s of stale) {
      lines.push(`### ${s.owner} \u2014 ${s.text}`, `- Anchor \`${s.anchor.ref}\` no longer resolves`, `  (${s.anchor.detail}). Re-anchor or downgrade.`, "");
    }
  }
  return lines.join("\n").trimEnd() + "\n";
}
function buildCheckRunPayload(diff, verify, ctx) {
  const staleResults = verify.results.filter((r) => r.anchor.status === "stale");
  const totalAnchors = verify.fresh + verify.stale + verify.unverifiable;
  const annotations = staleResults.slice(0, 50).map((s) => {
    const parsed = parseAnchorRef(s.anchor.ref);
    const path4 = parsed && (parsed.scheme === "git" || parsed.scheme === "doc") ? parsed.path : ".ledger/claims.md";
    const startLine = parsed && parsed.scheme === "git" ? parsed.startLine : 1;
    const endLine = parsed && parsed.scheme === "git" ? parsed.endLine : 1;
    return {
      path: path4,
      start_line: startLine,
      end_line: endLine,
      annotation_level: "warning",
      title: `Stale anchor for ${s.owner}`,
      message: `This change breaks the anchor for ${s.owner} ('${s.text.slice(0, 80)}...'). Run \`edt reanchor ${s.owner}\` or accept the downgrade to tentative. (${s.anchor.detail})`
    };
  });
  const conclusion = verify.stale > 0 ? "action_required" : verify.tentative > 0 ? "neutral" : "success";
  const titleParts = [];
  if (verify.stale > 0)
    titleParts.push(`${verify.stale} stale anchor${verify.stale === 1 ? "" : "s"}`);
  if (diff.added.length > 0)
    titleParts.push(`${diff.added.length} new claim${diff.added.length === 1 ? "" : "s"}`);
  if (titleParts.length === 0)
    titleParts.push("all anchors fresh");
  return {
    name: "claims-ledger/verify",
    head_sha: ctx.headSha ?? "",
    conclusion,
    output: {
      title: titleParts.join(", "),
      summary: `${ctx.baseCount} \u2192 ${ctx.headCount} claims \xB7 anchors verified: ${verify.fresh}/${totalAnchors} fresh`,
      annotations
    }
  };
}

// ../edt/dist/workspace.js
import * as path2 from "node:path";
var LEDGER_DIR = ".ledger";
var CLAIMS_MD = path2.join(LEDGER_DIR, "claims.md");
var LEDGER_JSON = path2.join(LEDGER_DIR, "ledger.json");
var TRACES_DIR = path2.join(LEDGER_DIR, "traces");

// ../edt/dist/openrouter.js
var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function openrouterComplete(apiKey, model, prompt, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0)
      await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      const res = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/isatimur/claims-ledger",
          "X-Title": "claims-ledger extract"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: opts.maxTokens ?? 1024,
          ...opts.json !== false ? { response_format: { type: "json_object" } } : {}
        })
      });
      if (res.status === 429 || res.status >= 500)
        continue;
      if (!res.ok)
        return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      continue;
    }
  }
  return null;
}

// src/run.ts
function git2(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}
function loadBaseClaims(workspace, ledgerPath, baseRef) {
  if (!baseRef) return [];
  for (const ref of [`origin/${baseRef}`, baseRef]) {
    const content = git2(workspace, ["show", `${ref}:${ledgerPath}`]);
    if (content !== null) return parseLedger(content);
  }
  return [];
}
function globToRegex(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "").replace(/\*\*/g, "").replace(/\*/g, "[^/]*").replace(/\u0001/g, "(?:.*/)?");
  return new RegExp(`^${esc}$`);
}
var EXTRACTABLE = /\.(md|mdx|markdown|txt|rst|adoc)$/i;
var MAX_EXCERPT = 8e3;
function extractSources(workspace, inputs) {
  let candidates = [];
  if (inputs.baseRef) {
    for (const ref of [`origin/${inputs.baseRef}`, inputs.baseRef]) {
      const out = git2(workspace, ["diff", "--name-only", "--diff-filter=ACMR", `${ref}...HEAD`]);
      if (out !== null) {
        candidates = out.split("\n").filter(Boolean);
        break;
      }
    }
  }
  if (candidates.length === 0) {
    const globs = (inputs.docsGlobs ?? ["docs/**/*.md", "README.md"]).map(globToRegex);
    const tracked = git2(workspace, ["ls-files"]) ?? "";
    candidates = tracked.split("\n").filter(Boolean).filter((f) => globs.some((g) => g.test(f)));
  }
  return candidates.filter((f) => EXTRACTABLE.test(f) && !f.startsWith(".ledger/")).map((f) => {
    const abs = path3.join(workspace, f);
    if (!fs2.existsSync(abs)) return null;
    const content = fs2.readFileSync(abs, "utf-8");
    return {
      path: f,
      content,
      ...content.length > MAX_EXCERPT ? { excerpt: content.slice(0, MAX_EXCERPT) } : {}
    };
  }).filter((s) => s !== null);
}
async function runAction(workspace, inputs) {
  const notices = [];
  let extractSummary;
  const ledgerFile = path3.join(workspace, inputs.ledgerPath);
  const headClaims = fs2.existsSync(ledgerFile) ? parseLedger(fs2.readFileSync(ledgerFile, "utf-8")) : [];
  if (!fs2.existsSync(ledgerFile)) {
    notices.push(`no ledger at ${inputs.ledgerPath} \u2014 run \`npx @claims-ledger/edt init\` to scaffold one.`);
  }
  if (inputs.mode === "extract" || inputs.mode === "both") {
    if (!inputs.complete && !inputs.openrouterApiKey) {
      notices.push("extract: skipped \u2014 no openrouter-api-key configured (flag-don't-fabricate).");
    } else {
      const complete = inputs.complete ?? ((prompt) => openrouterComplete(
        inputs.openrouterApiKey,
        inputs.extractModel ?? "deepseek/deepseek-chat",
        prompt
      ));
      const sources = extractSources(workspace, inputs);
      if (sources.length === 0) {
        notices.push("extract: no changed docs to mine claims from.");
      } else {
        const sha = git2(workspace, ["rev-parse", "--short", "HEAD"]) ?? inputs.headSha?.slice(0, 7) ?? "0000000";
        const nextId = headClaims.reduce(
          (m, c) => Math.max(m, parseInt(c.claim_id.replace(/^claims#/, ""), 10) || 0),
          0
        ) + 1;
        const result = await extractClaims(sources, complete, {
          sha,
          extractedBy: "auto-ledger-verify/1.0.0",
          existingClaims: headClaims.map((c) => c.text),
          nextId
        });
        let proposalsPath;
        if (result.accepted.length > 0) {
          proposalsPath = path3.join(path3.dirname(inputs.ledgerPath), "claims.proposed.md");
          fs2.mkdirSync(path3.dirname(path3.join(workspace, proposalsPath)), { recursive: true });
          fs2.writeFileSync(
            path3.join(workspace, proposalsPath),
            renderProposedClaims(result.accepted, result.rejected.length),
            "utf-8"
          );
        }
        notices.push(
          `extract: ${result.accepted.length} claim draft(s) anchored` + (result.rejected.length > 0 ? ` \xB7 ${result.rejected.length} rejected (quote did not resolve \u2014 anti-fabrication)` : "") + (result.errors.length > 0 ? ` \xB7 ${result.errors.length} source(s) errored` : "") + (proposalsPath ? ` \u2192 ${proposalsPath}` : "")
        );
        extractSummary = {
          accepted: result.accepted.length,
          rejected: result.rejected.length,
          errors: result.errors.length,
          ...proposalsPath ? { proposalsPath } : {}
        };
      }
    }
  }
  const baseClaims = loadBaseClaims(workspace, inputs.ledgerPath, inputs.baseRef);
  const diff = diffLedgers(baseClaims, headClaims);
  const verify = verifyAll(
    { claims: headClaims },
    { rootDir: workspace, transcriptsDir: inputs.transcriptsDir }
  );
  const ctx = {
    pr: inputs.pr,
    headSha: inputs.headSha,
    baseRef: inputs.baseRef,
    baseCount: baseClaims.length,
    headCount: headClaims.length
  };
  const report = renderLedgerReport(diff, verify, ctx);
  const reportPath = path3.join(path3.dirname(inputs.ledgerPath), "ledger-report.md");
  fs2.mkdirSync(path3.dirname(path3.join(workspace, reportPath)), { recursive: true });
  fs2.writeFileSync(path3.join(workspace, reportPath), report, "utf-8");
  const checkRun = buildCheckRunPayload(diff, verify, ctx);
  const badgePath = path3.join(path3.dirname(inputs.ledgerPath), "badge.json");
  fs2.writeFileSync(
    path3.join(workspace, badgePath),
    JSON.stringify(buildBadge(headClaims.length, verify), null, 2) + "\n",
    "utf-8"
  );
  const failureReasons = [];
  if (inputs.failOn.has("stale-anchor") && verify.stale > 0) {
    failureReasons.push(`${verify.stale} stale anchor(s)`);
  }
  if (inputs.failOn.has("unanchored-strong")) {
    const unanchoredStrong = headClaims.filter(
      (c) => c.support_level === "strong" && c.anchors.filter((a) => a.quote).length === 0
    );
    if (unanchoredStrong.length > 0) {
      failureReasons.push(
        `${unanchoredStrong.length} strong claim(s) without a quoted anchor: ${unanchoredStrong.map((c) => c.claim_id).join(", ")}`
      );
    }
  }
  if (inputs.failOn.has("support-downgrade") && diff.downgraded.length > 0) {
    failureReasons.push(
      `${diff.downgraded.length} support downgrade(s): ${diff.downgraded.map((d) => `${d.claim_id} ${d.from}\u2192${d.to}`).join(", ")}`
    );
  }
  return {
    diff,
    verify,
    report,
    reportPath,
    checkRun,
    ledgerDiffSummary: {
      added: diff.added.length,
      modified: diff.modified.length,
      removed: diff.removed.length,
      downgraded: diff.downgraded.length,
      stale: verify.stale
    },
    failed: failureReasons.length > 0,
    failureReasons,
    notices,
    ...extractSummary ? { extract: extractSummary } : {}
  };
}
function parseFailOn(raw) {
  return new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean)
  );
}

// src/main.ts
function input(name, fallback = "") {
  return (process.env[`INPUT_${name.replace(/-/g, "_").toUpperCase()}`] ?? fallback).trim();
}
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) {
    const delim = `ghadelim_${Date.now()}`;
    fs3.appendFileSync(file, `${name}<<${delim}
${value}
${delim}
`);
  } else {
    console.log(`::set-output name=${name}::${value}`);
  }
}
async function postCheckRun(payload) {
  const token = input("github-token") || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log("::notice::no github-token/repository \u2014 check-run payload written but not posted");
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/check-runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.log(`::warning::check-run POST failed: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.log(`::warning::check-run POST failed: ${e.message}`);
  }
}
async function main() {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  let pr;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs3.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs3.readFileSync(eventPath, "utf-8"));
      pr = event.pull_request?.number ?? event.number;
    } catch {
    }
  }
  const docsGlobs = input("docs-globs").split("\n").map((s) => s.trim()).filter(Boolean);
  const inputs = {
    ledgerPath: input("ledger-path", ".ledger/claims.md"),
    mode: input("mode", "both") || "both",
    failOn: parseFailOn(input("fail-on", "stale-anchor,unanchored-strong")),
    transcriptsDir: input("transcripts-dir", ".ledger/transcripts"),
    ...docsGlobs.length > 0 ? { docsGlobs } : {},
    ...input("extract-model") ? { extractModel: input("extract-model") } : {},
    ...input("openrouter-api-key") ? { openrouterApiKey: input("openrouter-api-key") } : {},
    ...process.env.GITHUB_SHA ? { headSha: process.env.GITHUB_SHA } : {},
    ...process.env.GITHUB_BASE_REF ? { baseRef: process.env.GITHUB_BASE_REF } : {},
    ...pr != null ? { pr } : {}
  };
  const result = await runAction(workspace, inputs);
  for (const n of result.notices) console.log(`::notice::${n}`);
  setOutput("ledger-diff", JSON.stringify(result.ledgerDiffSummary));
  setOutput("report-path", result.reportPath);
  const payloadPath = result.reportPath.replace(/ledger-report\.md$/, "check-run.json");
  fs3.writeFileSync(`${workspace}/${payloadPath}`, JSON.stringify(result.checkRun, null, 2) + "\n");
  if (inputs.mode !== "extract" && result.checkRun.head_sha) {
    await postCheckRun(result.checkRun);
  }
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) fs3.appendFileSync(summaryFile, result.report + "\n");
  console.log(result.report);
  if (result.failed) {
    for (const r of result.failureReasons) console.log(`::error::claims-ledger: ${r}`);
    process.exitCode = 1;
  }
}
main().catch((e) => {
  console.log(`::warning::claims-ledger internal error (not gating): ${e.stack}`);
  process.exitCode = 0;
});
