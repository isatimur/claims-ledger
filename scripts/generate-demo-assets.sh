#!/usr/bin/env bash
# Generate demo terminal screenshot + animated GIF (no asciinema/agg required)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/demo"
DOCS="$ROOT/docs"
FONT="/System/Library/Fonts/Menlo.ttc"
BG="#1a1b26"
FG="#c0caf5"
GREEN="#9ece6a"
RED="#f7768e"
ORANGE="#ff9e64"
CYAN="#7dcfff"

render_frame() {
  local out="$1"
  local title="$2"
  shift 2
  magick -size 900x200 "xc:${BG}" \
    -font "$FONT" -pointsize 14 -fill "$ORANGE" -annotate +20+30 "$title" \
    "$@" \
    "$out"
}

F1=$(mktemp).png
F2=$(mktemp).png
F3=$(mktemp).png
F4=$(mktemp).png
F5=$(mktemp).png

render_frame "$F1" "claims-ledger demo — verify" \
  -font "$FONT" -pointsize 13 -fill "$FG" -annotate +20+55 "▸ edt verify --gate" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+77 "anchors: 1/1 fresh" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+99 "gate: PASS — all anchored, all fresh" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+121 "exit code: 0"

render_frame "$F2" "claims-ledger demo — break anchor" \
  -font "$FONT" -pointsize 13 -fill "$FG" -annotate +20+55 "▸ Break the anchor — rewrite src/session.ts" \
  -font "$FONT" -pointsize 13 -fill "$RED" -annotate +20+77 "quote no longer resolves in src/session.ts" \
  -font "$FONT" -pointsize 13 -fill "$FG" -annotate +20+99 "(moved/deleted/reworded past fuzzy threshold 0.87)"

render_frame "$F3" "claims-ledger demo — stale (exit 11)" \
  -font "$FONT" -pointsize 13 -fill "$RED" -annotate +20+55 "✖ claims#1 git://…/src/session.ts#L1-L1" \
  -font "$FONT" -pointsize 13 -fill "$RED" -annotate +20+77 "gate: FAIL — ≥1 stale anchor (exit 11)" \
  -font "$FONT" -pointsize 13 -fill "$RED" -annotate +20+99 "exit code: 11"

render_frame "$F4" "claims-ledger demo — reanchor" \
  -font "$FONT" -pointsize 13 -fill "$CYAN" -annotate +20+55 "▸ edt reanchor claims#1" \
  -font "$FONT" -pointsize 13 -fill "$FG" -annotate +20+77 "→ git://…/src/rotation.ts#L1-L1  (exact, score 1.00)" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+99 "rewrote .ledger/claims.md (1 anchor updated)"

render_frame "$F5" "claims-ledger demo — fixed" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+55 "anchors: 1/1 fresh" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+77 "gate: PASS — all anchored, all fresh" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+99 "exit code: 0" \
  -font "$FONT" -pointsize 13 -fill "$GREEN" -annotate +20+121 "✓ Demo complete"

mkdir -p "$DEMO" "$DOCS"
magick "$F3" -bordercolor "$BG" -border 10 "$DEMO/demo-terminal.png"
magick -delay 120 -loop 0 "$F1" "$F2" "$F3" "$F4" "$F5" -layers Optimize "$DEMO/demo.gif"

magick -size 1280x640 "gradient:${BG}-#0f0f14" \
  -font "$FONT" -pointsize 72 -fill "$ORANGE" -annotate +80+120 "⚓" \
  -font "$FONT" -pointsize 56 -fill white -annotate +160+120 "claims-ledger" \
  -font "$FONT" -pointsize 28 -fill "$ORANGE" -annotate +80+180 "No anchor, no claim." \
  -font "$FONT" -pointsize 16 -fill "$FG" -annotate +80+260 "▸ edt verify --gate" \
  -font "$FONT" -pointsize 16 -fill "$RED" -annotate +80+290 "gate: FAIL — ≥1 stale anchor (exit 11)" \
  -font "$FONT" -pointsize 16 -fill "$CYAN" -annotate +80+330 "▸ edt reanchor claims#1" \
  -font "$FONT" -pointsize 16 -fill "$GREEN" -annotate +80+370 "gate: PASS — all anchored, all fresh (exit 0)" \
  -font "$FONT" -pointsize 14 -fill "#565f89" -annotate +80+580 "Source-anchored claims · CI-gated verification · GitHub Action + CLI + MCP" \
  "$DOCS/social-preview.png"

rm -f "$F1" "$F2" "$F3" "$F4" "$F5"
echo "✓ demo/demo-terminal.png demo/demo.gif docs/social-preview.png"
