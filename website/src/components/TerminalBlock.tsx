import type { ReactNode } from "react";

interface Line {
  prompt?: string;
  text: string;
  highlight?: boolean;
  comment?: boolean;
  exit?: number;
}

export function TerminalBlock({ lines, title }: { lines: Line[]; title?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[#0d0d0f] overflow-hidden font-[family-name:var(--font-mono)] text-sm terminal-glow">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        {title && <span className="ml-2 text-xs text-[var(--color-muted)]">{title}</span>}
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed m-0">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            {line.comment ? (
              <span className="text-[var(--color-muted)]">{line.text}</span>
            ) : (
              <>
                {line.prompt && <span className="text-[var(--color-accent)] select-none">{line.prompt}</span>}
                <span
                  className={
                    line.highlight
                      ? "text-[var(--color-terminal-green)]"
                      : line.exit !== undefined
                        ? line.exit === 0
                          ? "text-[var(--color-terminal-green)]"
                          : "text-[var(--color-terminal-red)]"
                        : "text-[var(--color-text)]"
                  }
                >
                  {line.text}
                  {line.exit !== undefined && ` (exit ${line.exit})`}
                </span>
              </>
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="rounded-lg border border-[var(--color-border)] bg-[#0d0d0f] p-4 overflow-x-auto text-sm font-[family-name:var(--font-mono)] leading-relaxed">
      {children}
    </pre>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-10">
      <h1 className="text-3xl md:text-4xl font-semibold mb-3">{title}</h1>
      <p className="text-[var(--color-muted)] text-lg max-w-2xl">{subtitle}</p>
    </div>
  );
}
