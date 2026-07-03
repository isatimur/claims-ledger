import {
  DEFAULT_JUDGE_MODELS,
  NullJudgePanel,
  type JudgePanel,
  type JudgeScoreRequest,
} from "@claims-ledger/ledger-core";

/**
 * OpenRouter-backed judge panel: three cross-family rivals score
 * claim ⟷ anchored-evidence entailment 0–100; the caller medians the result
 * (mergePanelScores) and flags spread > 20 instead of averaging it away.
 *
 * Requires OPENROUTER_API_KEY; without it the CLI falls back to NullJudgePanel
 * and `edt trace score` reports "scoring skipped" (flag-don't-fabricate —
 * support levels stay anchor-derived).
 */

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Rubrics for the two dimensions the blueprint collapses the book's six into. */
const DIMENSION_RUBRICS: Record<string, string> = {
  claim_defensibility:
    "claim_defensibility — does the anchored evidence entail the claim? " +
    "100: the quotes fully and directly entail the claim as stated. " +
    "50: the quotes are consistent with the claim but leave a material part unsupported. " +
    "0: the quotes contradict the claim or are unrelated to it.",
  evidence_density:
    "evidence_density — how much of the claim's surface area is covered by verbatim evidence? " +
    "100: every load-bearing assertion in the claim has its own anchored quote. " +
    "50: roughly half the assertions are quoted; the rest is extrapolation. " +
    "0: the quotes touch none of the claim's specific assertions.",
};

export function entailmentPrompt(req: JudgeScoreRequest): string {
  const rubric = DIMENSION_RUBRICS[req.dimension] ?? `${req.dimension} — score 0-100.`;
  const evidence =
    req.evidence.length > 0
      ? req.evidence.map((e, i) => `${i + 1}. "${e}"`).join("\n")
      : "(no anchored evidence provided)";
  return `You are one judge on a cross-family panel scoring the entailment between a
claim/decision and its anchored evidence quotes. Score exactly one dimension:

${rubric}

Judge ONLY what the quotes say — do not use outside knowledge to rescue an
unsupported claim. If no evidence is provided, the score is 0.

Claim: ${req.text}

Anchored evidence quotes:
${evidence}

Respond with ONLY a JSON object: {"score": <integer 0-100>}`;
}

/** Parse a model reply: strict JSON first, then a tolerant regex fallback. */
export function parseScoreReply(content: string): number | null {
  const clamp = (n: number) => (Number.isFinite(n) && n >= 0 && n <= 100 ? n : null);
  try {
    const obj = JSON.parse(content) as { score?: unknown };
    if (typeof obj.score === "number") return clamp(obj.score);
  } catch {
    /* fall through to regex */
  }
  const m = /"?score"?\s*[:=]\s*(\d+(?:\.\d+)?)/i.exec(content);
  return m ? clamp(parseFloat(m[1]!)) : null;
}

export interface OpenRouterPanelOptions {
  /** injectable for tests — defaults to global fetch */
  fetchImpl?: typeof fetch;
  /** attempts per model (1 initial + retries on 429/5xx/network) */
  maxAttempts?: number;
  /** base backoff in ms, doubled per retry */
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class OpenRouterJudgePanel implements JudgePanel {
  private readonly fetchImpl: typeof fetch;
  private readonly maxAttempts: number;
  private readonly backoffMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly apiKey: string,
    public models: string[] = DEFAULT_JUDGE_MODELS,
    opts: OpenRouterPanelOptions = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.backoffMs = opts.backoffMs ?? 500;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  /** One 0-100 score per model; null for a model that failed all attempts. */
  async score(req: JudgeScoreRequest): Promise<(number | null)[]> {
    return Promise.all(this.models.map((model) => this.scoreOne(model, req)));
  }

  private async scoreOne(model: string, req: JudgeScoreRequest): Promise<number | null> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      if (attempt > 0) await this.sleep(this.backoffMs * 2 ** (attempt - 1));
      try {
        const res = await this.fetchImpl(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/isatimur/claims-ledger",
            "X-Title": "claims-ledger judge panel",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: entailmentPrompt(req) }],
            temperature: 0,
            max_tokens: 64,
            response_format: { type: "json_object" },
          }),
        });
        if (res.status === 429 || res.status >= 500) continue; // retryable
        if (!res.ok) return null; // 4xx: bad key/model — retrying won't help
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content ?? "";
        return parseScoreReply(content);
      } catch {
        continue; // network error — retryable
      }
    }
    return null;
  }
}

/** Single completion helper (used by the extract-mode claim miner). */
export async function openrouterComplete(
  apiKey: string,
  model: string,
  prompt: string,
  opts: OpenRouterPanelOptions & { maxTokens?: number; json?: boolean } = {},
): Promise<string | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      const res = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/isatimur/claims-ledger",
          "X-Title": "claims-ledger extract",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: opts.maxTokens ?? 1024,
          ...(opts.json !== false ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      continue;
    }
  }
  return null;
}

export function panelFromEnv(env: NodeJS.ProcessEnv = process.env): JudgePanel {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return new NullJudgePanel();
  const models = env.EDT_JUDGE_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  return new OpenRouterJudgePanel(key, models && models.length > 0 ? models : undefined);
}
