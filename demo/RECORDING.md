# Recording the 60-second demo

## What was produced (2026-07-03 launch)

| Artifact | Path | Notes |
|----------|------|--------|
| **Animated GIF** | [`demo/demo.gif`](demo.gif) | 5-frame terminal sequence (verify → break → exit 11 → reanchor → pass). Generated with ImageMagick via [`scripts/generate-demo-assets.sh`](../scripts/generate-demo-assets.sh). |
| **Static screenshot** | [`demo/demo-terminal.png`](demo-terminal.png) | Exit-11 frame — used as fallback / social crops. |
| **Captured output** | [`demo/output/demo-run.md`](output/demo-run.md) | Full text transcript from `./demo/scenario.sh`. |

README embeds the GIF. No asciinema cast was recorded (`asciinema` / `agg` not installed on the build machine).

To regenerate assets after changing the demo script:

```bash
./demo/scenario.sh                    # refresh demo-run.md manually if output changed
./scripts/generate-demo-assets.sh     # rebuild demo.gif + docs/social-preview.png
```

---

## Option A: asciinema (best for interactive README)

```bash
brew install asciinema
cd claims-ledger
asciinema rec demo/output/demo.cast -c "./demo/scenario.sh"
asciinema upload demo/output/demo.cast   # returns https://asciinema.org/a/XXXXX
```

Embed:

```markdown
[![asciicast](https://asciinema.org/a/XXXXX.svg)](https://asciinema.org/a/XXXXX)
```

## Option B: terminal GIF via agg

```bash
brew install asciinema agg
asciinema rec demo/output/demo.cast -c "./demo/scenario.sh"
agg demo/output/demo.cast demo/demo.gif
```

## Option C: ImageMagick (no extra installs — used for launch)

See [`scripts/generate-demo-assets.sh`](../scripts/generate-demo-assets.sh).

## What the demo proves

1. `edt init` scaffolds `.ledger/` in one command
2. A claim with a `git://` anchor and verbatim quote verifies green
3. Refactoring the quoted line turns CI red — **exit 11**
4. `edt reanchor claims#1` follows the quote to its new file via fuzzy resolver
5. Verify passes again — the badge flips back to green
