import { ExternalLink } from "lucide-react";
import { CodeBlock, PageHeader } from "../components/TerminalBlock";

export function Action() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <PageHeader
        title="GitHub Action"
        subtitle="Auto-Ledger & Verify — extract claims, diff the ledger, verify anchors, annotate PRs."
      />

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Install</h2>
        <CodeBlock>{`# .github/workflows/ledger.yml
name: claims-ledger
on: [pull_request, push]

jobs:
  ledger:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: isatimur/claims-ledger@v1
        with:
          mode: both
          openrouter-api-key: \${{ secrets.OPENROUTER_API_KEY }}  # optional
      - uses: actions/upload-artifact@v4
        with:
          name: ledger-report
          path: .ledger/ledger-report.md`}</CodeBlock>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Inputs</h2>
        <div className="grid gap-3 text-sm">
          {[
            ["ledger-path", ".ledger/claims.md", "Markdown ledger (source of truth)"],
            ["mode", "both", "extract | verify | both"],
            ["fail-on", "stale-anchor,unanchored-strong", "Comma-separated gate conditions"],
            ["openrouter-api-key", "(optional)", "Extract + judge panel via OpenRouter"],
          ].map(([name, def, desc]) => (
            <div key={name} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)] shrink-0">{name}</code>
              <code className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">{def}</code>
              <span className="text-[var(--color-muted)]">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Modes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { mode: "verify", desc: "Freshness-check every anchor; fail on stale (default gate)" },
            { mode: "extract", desc: "Mine candidate claims from PR diffs → .ledger/claims.proposed.md" },
            { mode: "both", desc: "Extract then verify in one job" },
          ].map(({ mode, desc }) => (
            <div key={mode} className="rounded-xl border border-[var(--color-border)] p-4">
              <code className="text-[var(--color-accent)] font-[family-name:var(--font-mono)]">{mode}</code>
              <p className="text-sm text-[var(--color-muted)] mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Try without setup</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="https://github.com/isatimur/auto-ledger-verify"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-[var(--color-accent)]" />
            <span>
              <span className="block font-medium">auto-ledger-verify</span>
              <span className="text-xs text-[var(--color-muted)]">Marketplace namespace mirror</span>
            </span>
          </a>
          <a
            href="https://github.com/isatimur/claims-ledger-sandbox/fork"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-[var(--color-accent)]" />
            <span>
              <span className="block font-medium">claims-ledger-sandbox</span>
              <span className="text-xs text-[var(--color-muted)]">Fork & run in 30 seconds</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
