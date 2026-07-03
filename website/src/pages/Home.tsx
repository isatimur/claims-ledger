import { TerminalBlock } from "../components/TerminalBlock";

export function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 md:px-6 md:pt-24">
        <div className="max-w-3xl">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-4">
            Claims-Ledger-as-a-Service
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
            No anchor,
            <br />
            <span className="text-[var(--color-muted)]">no claim.</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-muted)] leading-relaxed mb-8 max-w-2xl">
            Every claim in your docs, PRs, and agent decisions carries a machine-verifiable pointer to its
            source — and CI fails when the pointer goes stale.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <a
              href="#try"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-black font-medium text-sm hover:bg-[var(--color-accent-dim)] transition-colors"
            >
              Try in 60 seconds
            </a>
            <a
              href="https://github.com/isatimur/claims-ledger"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:border-[var(--color-accent)]/40 transition-colors"
            >
              View on GitHub
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="https://www.npmjs.com/package/@claims-ledger/edt" target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/npm/v/@claims-ledger/edt?color=f97316&label=edt"
                alt="npm @claims-ledger/edt"
                height="20"
              />
            </a>
            <a href="https://www.npmjs.com/package/@claims-ledger/ledger-core" target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/npm/v/@claims-ledger/ledger-core?color=f97316&label=ledger-core"
                alt="npm @claims-ledger/ledger-core"
                height="20"
              />
            </a>
            <a href="https://github.com/isatimur/claims-ledger/stargazers" target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/github/stars/isatimur/claims-ledger?style=flat&color=f97316"
                alt="GitHub stars"
                height="20"
              />
            </a>
            <a href="https://github.com/isatimur/claims-ledger/actions/workflows/ledger.yml" target="_blank" rel="noopener noreferrer">
              <img
                src="https://github.com/isatimur/claims-ledger/actions/workflows/ledger.yml/badge.svg"
                alt="CI status"
                height="20"
              />
            </a>
            <img
              src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fisatimur%2Fclaims-ledger%2Fmain%2F.ledger%2Fbadge.json"
              alt="Claims verified"
              height="20"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] terminal-glow">
          <img
            src={`${import.meta.env.BASE_URL}demo.gif`}
            alt="Demo: verify passes, refactor breaks anchor (exit 11), reanchor fixes it"
            className="w-full"
            loading="lazy"
          />
        </div>
        <p className="text-center text-xs text-[var(--color-muted)] mt-3 font-[family-name:var(--font-mono)]">
          verify → stale anchor (exit 11) → reanchor → verify passes
        </p>
      </section>

      <section id="try" className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <h2 className="text-2xl font-semibold mb-6">Try in 60 seconds</h2>
        <TerminalBlock
          lines={[
            { prompt: "$", text: "npx @claims-ledger/edt init", highlight: true },
            { prompt: "$", text: "$EDITOR .ledger/claims.md" },
            { prompt: "$", text: "edt verify --gate" },
            { text: "# exit 0: all anchors fresh · exit 11: something went stale", comment: true },
          ]}
        />
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Gate every PR with zero local install:{" "}
          <code className="text-[var(--color-accent)]">uses: isatimur/claims-ledger@v1</code>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Six anchor schemes",
              body: "git://, doc://, adr://, gh://, yt://, ts:// — each with a verbatim quote that must resolve.",
            },
            {
              title: "CI that fails loud",
              body: "Stale anchors exit 11. No silent doc rot. Badge endpoint for README shields.",
            },
            {
              title: "Agents prove work",
              body: "Evidence Decision Traces + MCP tools so agents anchor decisions before acting.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-accent)]/30 transition-colors"
            >
              <h3 className="font-medium mb-2 text-[var(--color-accent)]">{card.title}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
