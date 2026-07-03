import { describe, expect, it, vi } from "vitest";
import { mergePanelScores } from "@claims-ledger/ledger-core";
import {
  OpenRouterJudgePanel,
  entailmentPrompt,
  openrouterComplete,
  panelFromEnv,
  parseScoreReply,
} from "../src/openrouter.js";

/** Judge-panel client against a fully mocked OpenRouter HTTP surface —
 *  no OPENROUTER_API_KEY is ever required for these tests. */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completion(content: string, status = 200): Response {
  return jsonResponse({ choices: [{ message: { content } }] }, status);
}

const REQ = {
  text: "Auth tokens rotate every 24h",
  evidence: ['const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000'],
  dimension: "claim_defensibility",
};

const noSleep = { sleep: async () => {}, backoffMs: 0 };

describe("entailmentPrompt", () => {
  it("embeds the claim, numbered evidence, and the dimension rubric", () => {
    const p = entailmentPrompt(REQ);
    expect(p).toContain("claim_defensibility");
    expect(p).toContain("Claim: Auth tokens rotate every 24h");
    expect(p).toContain('1. "const ROTATION_INTERVAL_MS');
    expect(p).toContain('{"score"');
  });

  it("tells the judge to score 0 when there is no evidence", () => {
    const p = entailmentPrompt({ ...REQ, evidence: [] });
    expect(p).toContain("(no anchored evidence provided)");
  });

  it("has a distinct rubric for evidence_density", () => {
    const p = entailmentPrompt({ ...REQ, dimension: "evidence_density" });
    expect(p).toContain("evidence_density");
    expect(p).toContain("surface area");
  });
});

describe("parseScoreReply", () => {
  it("parses strict JSON-mode output", () => {
    expect(parseScoreReply('{"score": 87}')).toBe(87);
  });
  it("falls back to regex for chatty non-JSON output", () => {
    expect(parseScoreReply('Sure! The score is {"score": 42} based on...')).toBe(42);
    expect(parseScoreReply("score: 73")).toBe(73);
  });
  it("rejects out-of-range and unparseable replies", () => {
    expect(parseScoreReply('{"score": 250}')).toBeNull();
    expect(parseScoreReply('{"score": -5}')).toBeNull();
    expect(parseScoreReply("I cannot score this.")).toBeNull();
  });
});

describe("OpenRouterJudgePanel", () => {
  it("scores once per model with JSON mode and returns per-model scores", async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string; response_format?: unknown };
      expect(body.response_format).toEqual({ type: "json_object" });
      const byModel: Record<string, number> = { "m/a": 88, "m/b": 91, "m/c": 86 };
      return completion(JSON.stringify({ score: byModel[body.model] }));
    });
    const panel = new OpenRouterJudgePanel("test-key", ["m/a", "m/b", "m/c"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...noSleep,
    });
    const scores = await panel.score(REQ);
    expect(scores).toEqual([88, 91, 86]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const merged = mergePanelScores(scores)!;
    expect(merged.median).toBe(88);
    expect(merged.flagged).toBe(false);
  });

  it("retries 429/5xx with backoff and succeeds on a later attempt", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) return jsonResponse({ error: "rate limited" }, 429);
      if (calls === 2) return jsonResponse({ error: "upstream" }, 502);
      return completion('{"score": 70}');
    });
    const panel = new OpenRouterJudgePanel("k", ["m/a"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...noSleep,
    });
    expect(await panel.score(REQ)).toEqual([70]);
    expect(calls).toBe(3);
  });

  it("does not retry a 4xx (bad key) and returns null for that model", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "unauthorized" }, 401));
    const panel = new OpenRouterJudgePanel("bad", ["m/a"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...noSleep,
    });
    expect(await panel.score(REQ)).toEqual([null]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns null after exhausting retries on network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    const panel = new OpenRouterJudgePanel("k", ["m/a"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxAttempts: 3,
      ...noSleep,
    });
    expect(await panel.score(REQ)).toEqual([null]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("spread > 20 across models flags the merged verdict", async () => {
    const byModel: Record<string, number> = { "m/a": 60, "m/b": 95, "m/c": 88 };
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      return completion(`{"score": ${byModel[body.model]}}`);
    });
    const panel = new OpenRouterJudgePanel("k", ["m/a", "m/b", "m/c"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...noSleep,
    });
    const merged = mergePanelScores(await panel.score(REQ))!;
    expect(merged.median).toBe(88);
    expect(merged.spread).toBe(35);
    expect(merged.flagged).toBe(true);
  });
});

describe("openrouterComplete", () => {
  it("returns the completion content and retries retryable statuses", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) return jsonResponse({}, 503);
      return completion('{"claims": []}');
    });
    const out = await openrouterComplete("k", "m/a", "prompt", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...noSleep,
    });
    expect(out).toBe('{"claims": []}');
    expect(calls).toBe(2);
  });

  it("returns null on persistent failure", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
    expect(
      await openrouterComplete("k", "m/a", "p", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        maxAttempts: 2,
        ...noSleep,
      }),
    ).toBeNull();
  });
});

describe("panelFromEnv", () => {
  it("returns NullJudgePanel without a key (flag-don't-fabricate)", async () => {
    const panel = panelFromEnv({} as NodeJS.ProcessEnv);
    expect(await panel.score(REQ)).toEqual([null, null, null]);
  });

  it("uses OpenRouter with the default cross-family models when a key exists", () => {
    const panel = panelFromEnv({ OPENROUTER_API_KEY: "k" } as NodeJS.ProcessEnv);
    expect(panel).toBeInstanceOf(OpenRouterJudgePanel);
    expect(panel.models).toEqual([
      "meta-llama/llama-3.3-70b",
      "qwen/qwen-2.5-72b",
      "deepseek/deepseek-chat",
    ]);
  });

  it("honors EDT_JUDGE_MODELS override", () => {
    const panel = panelFromEnv({
      OPENROUTER_API_KEY: "k",
      EDT_JUDGE_MODELS: "a/x, b/y",
    } as NodeJS.ProcessEnv);
    expect(panel.models).toEqual(["a/x", "b/y"]);
  });
});
