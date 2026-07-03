import { CodeBlock, PageHeader, TerminalBlock } from "../components/TerminalBlock";

const ANCHOR_SCHEMES = [
  { scheme: "git://", example: "git://4f2a9c1/services/session/rotate.ts#L41-L58", resolves: "File at SHA + line range; quote must appear in those lines" },
  { scheme: "doc://", example: "doc://docs/adr/0007-auth.md#decision@e91b3d0", resolves: "Markdown file + heading slug; optional @sha pin" },
  { scheme: "adr://", example: "adr://0007@e91b3d0", resolves: "ADR id prefix under docs/adr/ or similar" },
  { scheme: "gh://", example: "gh://issues/42#comment-123456", resolves: "GitHub issue/discussion/PR comment (online)" },
  { scheme: "yt://", example: "yt://dQw4w9WgXcQ 00:01:23.000 → 00:01:45.000", resolves: "YouTube timestamp range (offline: unverifiable)" },
  { scheme: "ts://", example: "ts://standup-2025-03 00:05:00.000 → 00:05:30.000", resolves: "Local transcript/recording timestamp range" },
];

const EXIT_CODES = [
  { code: 0, label: "ok", desc: "All gated anchors fresh" },
  { code: 10, label: "tentative", desc: "Moderate claims without strong anchors (informational)" },
  { code: 11, label: "stale anchor", desc: "Quote no longer resolves — CI should fail" },
  { code: 12, label: "panel spread", desc: "Judge panel spread > 20 on a trace decision" },
  { code: 13, label: "trace missing", desc: "Branch requires an Evidence Decision Trace but none found" },
  { code: 2, label: "internal", desc: "Parse/config error (never gates)" },
];

export function Docs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <PageHeader
        title="Documentation"
        subtitle="Quickstart, CLI reference, exit codes, and anchor schemes."
      />

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Quickstart</h2>
        <TerminalBlock
          title="terminal"
          lines={[
            { prompt: "$", text: "npx @claims-ledger/edt init", highlight: true },
            { prompt: "$", text: "$EDITOR .ledger/claims.md" },
            { prompt: "$", text: "edt verify --gate", exit: 0 },
          ]}
        />
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          <code>edt init</code> scaffolds <code>.ledger/claims.md</code>, <code>ledger.json</code>, and a pre-commit hook.
          Write claims with anchor URIs and verbatim quotes. <code>edt verify --gate</code> re-resolves every quote.
        </p>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          <strong className="text-[var(--color-text)]">npm not published yet?</strong>{" "}
          <code className="text-[var(--color-accent)]">git clone https://github.com/isatimur/claims-ledger.git</code>, then{" "}
          <code className="text-[var(--color-accent)]">npm ci && npm run build && npm exec -w @claims-ledger/edt edt init</code>.
        </p>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">CLI commands</h2>
        <CodeBlock>{`edt init                                  # scaffold .ledger/
edt verify [--gate] [--trace PATH]        # freshness-check anchors
edt reanchor <claims#N>                 # resolver cascade
edt trace new [--pr N] [--agent NAME]     # open Evidence Decision Trace
edt trace add-decision --text T --kind K  # append anchored decision
edt trace score                           # judge panel (needs OPENROUTER_API_KEY)
edt render --format pr-body|report        # emit PR body / report
edt export --format ledger-json           # build .ledger/ledger.json
edt mcp serve                             # MCP server on stdio`}</CodeBlock>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Gate exit codes</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-muted)]">Code</th>
                <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-muted)]">Label</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)]">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {EXIT_CODES.map(({ code, label, desc }) => (
                <tr key={code} className="border-b border-[var(--color-border)]/50 last:border-0">
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{code}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)]">{label}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Anchor schemes</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Every strong claim needs at least one anchor with a verbatim quote. Resolution uses exact match, then fuzzy (≥ 0.87).
        </p>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-muted)]">Scheme</th>
                <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-muted)]">Example</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)]">Resolves when</th>
              </tr>
            </thead>
            <tbody>
              {ANCHOR_SCHEMES.map(({ scheme, example, resolves }) => (
                <tr key={scheme} className="border-b border-[var(--color-border)]/50 last:border-0">
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-accent)] whitespace-nowrap">{scheme}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs break-all">{example}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{resolves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Claim format</h2>
        <CodeBlock>{`## claims#1 · strong · auth/session

Auth tokens rotate every 24 hours via \`rotate.ts\`.

⚓ git://4f2a9c1/services/session/rotate.ts#L41-L58 "tokens expire after twenty-four hours"`}</CodeBlock>
      </section>
    </div>
  );
}
