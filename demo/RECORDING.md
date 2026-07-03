# Recording the 60-second demo

## Option A: asciinema (recommended for README)

```bash
# Install: brew install asciinema  (or apt install asciinema)
cd /path/to/claims-ledger
asciinema rec demo.cast -c "./demo/scenario.sh"
# Upload: asciinema upload demo.cast
# Embed:  [![asciicast](https://asciinema.org/a/XXXXX.svg)](https://asciinema.org/a/XXXXX)
```

## Option B: terminal GIF (for HN / Product Hunt)

```bash
# Install: brew install agg terminal-notifier
./demo/scenario.sh | agg --speed 1.2 demo.gif
```

Commit `demo.gif` to the repo or host on GitHub releases, then replace the
placeholder in README:

```markdown
[![60-second demo](demo/demo.gif)](demo/scenario.sh)
```

## Option C: static output (no recording needed)

The captured run lives in [`demo/output/demo-run.md`](output/demo-run.md).
Paste it into README or link to it for HN commenters who prefer text.

## What the demo proves

1. `edt init` scaffolds `.ledger/` in one command
2. A claim with a `git://` anchor and verbatim quote verifies green
3. Refactoring the quoted line turns CI red — **exit 11**
4. `edt reanchor claims#1` follows the quote to its new file via fuzzy resolver
5. Verify passes again — the badge flips back to green
