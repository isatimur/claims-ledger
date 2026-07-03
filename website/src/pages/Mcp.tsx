import { CodeBlock, PageHeader } from "../components/TerminalBlock";

const TOOLS = [
  {
    name: "ledger_search",
    desc: "Keyword search over the repo's Claims Ledger and open trace — find anchored evidence BEFORE deciding.",
    input: '{ "query": "auth rotation", "k": 5 }',
  },
  {
    name: "trace_add_decision",
    desc: "Append an anchored decision to the open trace. Quotes MUST resolve at their ref — fabricated quotes are rejected.",
    input: '{ "text": "...", "kind": "refactor", "anchors": [{ "ref": "git://...", "quote": "..." }] }',
  },
  {
    name: "trace_score",
    desc: "Run the cross-family judge panel over every decision⟷evidence pair (median + spread>20 flagging).",
    input: "{}",
  },
  {
    name: "anchor_verify",
    desc: "Freshness-check a single anchor ref (optionally with its quote) against the working tree.",
    input: '{ "ref": "git://sha/path#L1-L2", "quote": "verbatim text" }',
  },
  {
    name: "ledger_claims",
    desc: "List existing claims (optionally filtered by scope) so an agent knows which claims its diff might invalidate.",
    input: '{ "scope": "gateway/auth" }',
  },
];

export function Mcp() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <PageHeader
        title="MCP Server"
        subtitle="Expose the trace machinery as MCP tools for Claude Code, Cursor, Copilot, and LangGraph agents."
      />

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Start the server</h2>
        <CodeBlock>{`# From a repo with .ledger/
edt mcp serve

# Claude Desktop / Cursor config (~/.cursor/mcp.json or claude_desktop_config.json)
{
  "mcpServers": {
    "claims-ledger": {
      "command": "npx",
      "args": ["@claims-ledger/edt", "mcp", "serve"],
      "cwd": "/path/to/your/repo"
    }
  }
}`}</CodeBlock>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-4">Tools</h2>
        <div className="space-y-4">
          {TOOLS.map(({ name, desc, input }) => (
            <div key={name} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <code className="text-[var(--color-accent)] font-[family-name:var(--font-mono)]">{name}</code>
              <p className="text-sm text-[var(--color-muted)] mt-2 mb-3 leading-relaxed">{desc}</p>
              <pre className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-muted)] bg-[#0d0d0f] rounded-lg p-3 overflow-x-auto">
                {input}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Agent workflow</h2>
        <ol className="space-y-3 text-sm text-[var(--color-muted)] list-decimal list-inside">
          <li>
            <code className="text-[var(--color-text)]">ledger_search</code> — find existing claims before changing code
          </li>
          <li>
            <code className="text-[var(--color-text)]">trace_add_decision</code> — record each decision with resolving anchors
          </li>
          <li>
            <code className="text-[var(--color-text)]">anchor_verify</code> — spot-check anchors before committing
          </li>
          <li>
            <code className="text-[var(--color-text)]">trace_score</code> — optional judge panel when OPENROUTER_API_KEY is set
          </li>
        </ol>
        <p className="mt-6 text-sm">
          Skill file for Claude Code / Cursor:{" "}
          <a
            href="https://github.com/isatimur/claims-ledger/blob/main/skills/claims-ledger/SKILL.md"
            className="text-[var(--color-accent)] hover:underline"
          >
            skills/claims-ledger/SKILL.md
          </a>
        </p>
      </section>
    </div>
  );
}
