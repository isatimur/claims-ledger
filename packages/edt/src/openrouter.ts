import {
  DEFAULT_JUDGE_MODELS,
  NullJudgePanel,
  type JudgePanel,
  type JudgeScoreRequest,
} from "@claims-ledger/ledger-core";

/**
 * OpenRouter-backed judge panel: three cross-family rivals score
 * claim ⟷ anchored-evidence entailment 0–100; the caller medians the result
 * (mergePanelScores). Requires OPENROUTER_API_KEY; without it the CLI falls
 * back to NullJudgePanel and `edt trace score` reports "scoring skipped"
 * (flag-don't-fabricate — support levels stay anchor-derived).
 */

const PROMPT = (req: JudgeScoreRequest) => `You are scoring one dimension: ${req.dimension}.
Given a decision/claim and its anchored evidence quotes, return ONLY a JSON
object {"score": <0-100>} where 100 means the evidence fully entails the claim.

Claim: ${req.text}
Evidence:
${req.evidence.map((e) => `- "${e}"`).join("\n")}`;

export class OpenRouterJudgePanel implements JudgePanel {
  constructor(
    private readonly apiKey: string,
    public models: string[] = DEFAULT_JUDGE_MODELS,
  ) {}

  async score(req: JudgeScoreRequest): Promise<(number | null)[]> {
    return Promise.all(
      this.models.map(async (model) => {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: PROMPT(req) }],
              temperature: 0,
            }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const content = data.choices?.[0]?.message?.content ?? "";
          const m = /"score"\s*:\s*(\d+(?:\.\d+)?)/.exec(content);
          if (!m) return null;
          const score = parseFloat(m[1]!);
          return score >= 0 && score <= 100 ? score : null;
        } catch {
          return null;
        }
      }),
    );
  }
}

export function panelFromEnv(env: NodeJS.ProcessEnv = process.env): JudgePanel {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return new NullJudgePanel();
  const models = env.EDT_JUDGE_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  return new OpenRouterJudgePanel(key, models && models.length > 0 ? models : undefined);
}
