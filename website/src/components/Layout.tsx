import { Link, useLocation } from "react-router-dom";
import { Anchor, Github } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/docs", label: "Docs" },
  { to: "/action", label: "Action" },
  { to: "/ledgers", label: "Ledgers" },
  { to: "/mcp", label: "MCP" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col gradient-radial">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] group-hover:bg-[var(--color-accent)]/25 transition-colors">
              <Anchor className="h-4 w-4" />
            </span>
            <span className="font-[family-name:var(--font-mono)] text-sm tracking-tight">
              claims<span className="text-[var(--color-muted)]">-</span>ledger
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === to
                    ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://www.npmjs.com/package/@claims-ledger/edt"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs font-[family-name:var(--font-mono)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/40 transition-colors"
            >
              npm
            </a>
            <a
              href="https://github.com/isatimur/claims-ledger"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent)]/40 transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>

        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 border-t border-[var(--color-border)]/50">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs ${
                pathname === to ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--color-border)] mt-16">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            <span className="text-[var(--color-accent)]">⚓</span> No anchor, no claim.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-[family-name:var(--font-mono)] text-[var(--color-muted)]">
            <a href="https://fromcopilottocolleague.com" className="hover:text-[var(--color-text)] transition-colors">
              fromcopilottocolleague.com
            </a>
            <a href="https://github.com/isatimur/claims-ledger/blob/main/LICENSE" className="hover:text-[var(--color-text)] transition-colors">
              MIT
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
