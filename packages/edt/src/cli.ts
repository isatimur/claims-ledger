import { EXIT, type DecisionKind } from "@claims-ledger/ledger-core";
import {
  cmdExport,
  cmdInit,
  cmdReanchor,
  cmdRender,
  cmdTraceAddDecision,
  cmdTraceNew,
  cmdTraceScore,
  cmdVerify,
  consoleIo,
} from "./commands.js";
import { panelFromEnv } from "./openrouter.js";
import { findRoot } from "./workspace.js";

const HELP = `edt — Evidence Decision Trace (claims-ledger.dev)

Usage:
  edt init                                  scaffold .ledger/ + pre-commit hook
  edt trace new [--pr N] [--agent NAME]     open a trace for the current branch
  edt trace add-decision --text T --kind K  append an anchored decision
      [--anchor URI]... [--quote Q]...      (anchors/quotes pair by position)
      [--confidence high|medium|low] [--force]
  edt trace score                           judge-panel scoring (needs OPENROUTER_API_KEY)
  edt verify [--gate] [--trace PATH]        freshness-check every anchor
      [--only-touched] [--count] [--require-trace]
  edt reanchor <claims#N>                   resolver cascade against current tree
  edt render --format pr-body|report        emit the PR body block / report
  edt export --format ledger-json           build .ledger/ledger.json

Gate exit codes: 0 ok · 10 tentative · 11 stale anchor · 12 panel spread > 20
                 13 trace missing · 2 internal error (never gates)`;

interface Parsed {
  positional: string[];
  flags: Map<string, string[] | boolean>;
}

const BOOL_FLAGS = new Set([
  "gate",
  "only-touched",
  "count",
  "require-trace",
  "force",
  "dry-run",
]);

function parseArgs(argv: string[]): Parsed {
  const positional: string[] = [];
  const flags = new Map<string, string[] | boolean>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = argv[i + 1];
      if (BOOL_FLAGS.has(name)) {
        flags.set(name, true);
        continue;
      }
      if (next !== undefined && !next.startsWith("--")) {
        const list = (flags.get(name) as string[] | undefined) ?? [];
        if (Array.isArray(list)) {
          list.push(next);
          flags.set(name, list);
        }
        i++;
      } else {
        flags.set(name, true);
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function str(p: Parsed, name: string): string | undefined {
  const v = p.flags.get(name);
  return Array.isArray(v) ? v[v.length - 1] : undefined;
}

function list(p: Parsed, name: string): string[] {
  const v = p.flags.get(name);
  return Array.isArray(v) ? v : [];
}

function bool(p: Parsed, name: string): boolean {
  return p.flags.has(name);
}

export async function main(argv: string[]): Promise<number> {
  const p = parseArgs(argv);
  const [cmd, sub] = p.positional;
  const root = findRoot();
  const io = consoleIo;

  try {
    switch (cmd) {
      case "init":
        return cmdInit(root, io);

      case "trace": {
        if (sub === "new") {
          const pr = str(p, "pr");
          return cmdTraceNew(root, io, {
            ...(pr ? { pr: parseInt(pr, 10) } : {}),
            ...(str(p, "agent") ? { agent: str(p, "agent")! } : {}),
          });
        }
        if (sub === "add-decision") {
          const text = str(p, "text");
          if (!text) {
            io.err("--text is required");
            return 1;
          }
          return cmdTraceAddDecision(root, io, {
            text,
            kind: (str(p, "kind") ?? "behavior") as DecisionKind,
            anchors: list(p, "anchor"),
            quotes: list(p, "quote"),
            confidence: (str(p, "confidence") ?? "medium") as "high" | "medium" | "low",
            ...(str(p, "trace") ? { trace: str(p, "trace")! } : {}),
            ...(bool(p, "force") ? { force: true } : {}),
          });
        }
        if (sub === "score") {
          return await cmdTraceScore(root, io, panelFromEnv(), {
            ...(str(p, "trace") ? { trace: str(p, "trace")! } : {}),
          });
        }
        io.err(HELP);
        return 1;
      }

      case "verify":
        return cmdVerify(root, io, {
          gate: bool(p, "gate"),
          onlyTouched: bool(p, "only-touched"),
          count: bool(p, "count"),
          requireTrace: bool(p, "require-trace"),
          ...(str(p, "trace") ? { trace: str(p, "trace")! } : {}),
        });

      case "reanchor": {
        const id = sub;
        if (!id) {
          io.err("usage: edt reanchor <claims#N>");
          return 1;
        }
        return cmdReanchor(root, io, id, { write: !bool(p, "dry-run") });
      }

      case "render":
        return cmdRender(root, io, {
          format: str(p, "format") ?? "pr-body",
          ...(str(p, "trace") ? { trace: str(p, "trace")! } : {}),
        });

      case "export":
        return cmdExport(root, io, {
          format: str(p, "format") ?? "ledger-json",
          ...(str(p, "trace") ? { trace: str(p, "trace")! } : {}),
        });

      case "help":
      case undefined:
        io.out(HELP);
        return EXIT.OK;

      default:
        io.err(`unknown command: ${cmd}\n\n${HELP}`);
        return 1;
    }
  } catch (e) {
    io.err(`internal error: ${(e as Error).stack ?? e}`);
    return EXIT.INTERNAL_ERROR;
  }
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
