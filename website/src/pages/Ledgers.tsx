import { ExternalLink } from "lucide-react";
import { PageHeader } from "../components/TerminalBlock";

const LEDGERS = [
  { slug: "openai-harness-engineering-2025", title: "Harness Engineering — Ryan Lopopolo, OpenAI", claims: 5 },
  { slug: "sean-grove-new-code-2025", title: "The New Code — Sean Grove, OpenAI", claims: 5 },
  { slug: "cursor-software-factory-2025", title: "Building Your Own Software Factory — Eric Zakariasson, Cursor", claims: 5 },
  { slug: "joel-hron-trustworthy-agents-2025", title: "Trustworthy Agents for High-Stakes — Joel Hron, Thomson Reuters", claims: 5 },
  { slug: "anthropic-build-skills-2025", title: "Building Skills — Anthropic", claims: 5 },
];

export function Ledgers() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <PageHeader
        title="Books of Truth"
        subtitle="Event ledgers — timestamp-anchored claims from keynotes, processed with the same grammar as your codebase."
      />

      <p className="text-[var(--color-muted)] mb-8 leading-relaxed">
        Each ledger is a sample <code>.ledger/claims.md</code> extracted from a practitioner talk. Browse the interactive
        evidence graph on the book site, or inspect the source in the repo.
      </p>

      <div className="grid gap-4 mb-10">
        {LEDGERS.map(({ slug, title, claims }) => (
          <a
            key={slug}
            href={`https://fromcopilottocolleague.com/ledgers/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-4 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <div>
              <h3 className="font-medium group-hover:text-[var(--color-accent)] transition-colors">{title}</h3>
              <p className="text-sm text-[var(--color-muted)] mt-1">{claims} claims · yt:// timestamp anchors</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors mt-1" />
          </a>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <a
          href="https://fromcopilottocolleague.com/ledgers"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-black font-medium text-sm hover:bg-[var(--color-accent-dim)] transition-colors"
        >
          Browse all ledgers
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href="https://github.com/isatimur/claims-ledger/tree/main/examples/ledgers"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:border-[var(--color-accent)]/40 transition-colors"
        >
          Source in repo
        </a>
      </div>
    </div>
  );
}
