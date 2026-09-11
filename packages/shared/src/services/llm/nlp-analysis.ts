import {
  analysisOutputSchema,
  LlmError,
  type AnalysisInput,
  type AnalysisOutput,
} from "./types";
import { ANALYSIS_JSON_SCHEMA, buildAnalysisMessages } from "./prompts/analysis-prompt";

/**
 * NLP analysis service (HLSA AD-19, PRD FR-11–FR-16). Wraps an LLM provider
 * with retry/backoff AND a hard validation gate: a response that is not
 * valid JSON of the right shape is rejected and retried, never returned to
 * the caller for persistence (skills/api-testing-reporting.md "malformed AI
 * JSON").
 *
 * Provider-agnostic by interface; the only implementation is OpenAI, using
 * `response_format: json_schema` (strict) so the model is constrained at the
 * API layer as well.
 */

export interface AnalysisProvider {
  readonly model: string;
  /** Returns the raw model text (expected to be JSON). Throws LlmError on transport failure. */
  complete(input: AnalysisInput): Promise<string>;
}

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface OpenAIAnalysisProviderOptions {
  apiKey: string;
  model?: string;
  /** gpt-5 family uses max_completion_tokens; reasoning tokens count toward it. */
  maxCompletionTokens?: number;
  timeoutMs?: number;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { total_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
}

export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly model: string;
  private readonly apiKey: string;
  private readonly maxCompletionTokens: number;
  private readonly timeoutMs: number;

  constructor(options: OpenAIAnalysisProviderOptions) {
    if (!options.apiKey) throw new Error("OpenAIAnalysisProvider requires an apiKey");
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-5-mini";
    // The structured multi-section reasoning (Requirement/Compliance/Gap/
    // Update/Priority/Evidence) runs longer than a plain summary, and gpt-5's
    // reasoning tokens count against this same budget.
    this.maxCompletionTokens = options.maxCompletionTokens ?? 6000;
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async complete(input: AnalysisInput): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(OPENAI_CHAT_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: buildAnalysisMessages(input),
          max_completion_tokens: this.maxCompletionTokens,
          response_format: { type: "json_schema", json_schema: ANALYSIS_JSON_SCHEMA },
        }),
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new LlmError(
        aborted ? `OpenAI analysis timed out after ${this.timeoutMs}ms` : "OpenAI analysis request failed",
        err,
        true,
      );
    } finally {
      clearTimeout(timer);
    }

    const bodyText = await response.text();
    let parsed: OpenAIChatResponse;
    try {
      parsed = JSON.parse(bodyText) as OpenAIChatResponse;
    } catch {
      throw new LlmError(
        `OpenAI analysis returned non-JSON (HTTP ${response.status})`,
        bodyText.slice(0, 500),
        response.status >= 500 || response.status === 429,
      );
    }

    if (!response.ok || parsed.error) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new LlmError(
        `OpenAI analysis error (HTTP ${response.status}): ${parsed.error?.message ?? bodyText.slice(0, 300)}`,
        parsed.error,
        retryable,
      );
    }

    const choice = parsed.choices?.[0];
    const content = choice?.message?.content?.trim();
    if (!content) {
      throw new LlmError(
        `OpenAI analysis returned no content (finish_reason: ${choice?.finish_reason ?? "unknown"})`,
        undefined,
        choice?.finish_reason === "length", // truncated -> retry with more headroom is futile, but transient rate limits look similar; treat as retryable once
      );
    }
    return content;
  }
}

export interface NlpAnalysisServiceOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export class NlpAnalysisService {
  private readonly provider: AnalysisProvider;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(provider: AnalysisProvider, options: NlpAnalysisServiceOptions = {}) {
    this.provider = provider;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
  }

  get model(): string {
    return this.provider.model;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const raw = await this.provider.complete(input);

        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch (err) {
          throw new LlmError("LLM response was not valid JSON", err, true);
        }

        const validated = analysisOutputSchema.safeParse(json);
        if (!validated.success) {
          throw new LlmError(
            `LLM JSON failed schema validation: ${validated.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
            undefined,
            true,
          );
        }

        if (attempt > 0) {
          console.log(
            JSON.stringify({
              level: "info",
              component: "NlpAnalysisService",
              message: "analysis succeeded after retry",
              attempt,
            }),
          );
        }

        return {
          oneLine: validated.data.one_line.trim(),
          detailed: validated.data.detailed.trim(),
          summary: validated.data.summary.trim(),
          evidenceSufficient: validated.data.evidence_sufficient,
          model: this.provider.model,
        };
      } catch (err) {
        lastError = err;
        const retryable = err instanceof LlmError ? err.retryable : true;
        console.error(
          JSON.stringify({
            level: "error",
            component: "NlpAnalysisService",
            message: "analysis attempt failed",
            attempt,
            retryable,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        if (!retryable || attempt === this.maxRetries) break;
        await new Promise((r) => setTimeout(r, this.baseDelayMs * 2 ** attempt));
      }
    }

    throw lastError instanceof LlmError
      ? lastError
      : new LlmError("analysis failed after all retries", lastError, false);
  }
}
