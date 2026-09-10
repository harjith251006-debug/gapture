import type { EmbeddingProvider } from "../embedding-provider.interface";
import { EmbeddingError, type EmbeddingRequest, type EmbeddingResult } from "../types";

/**
 * OpenAI Embeddings integration (HLSA AD-09). Verified against OpenAI's
 * published API reference — the v3 models accept a `dimensions` parameter
 * that natively truncates the output vector (Matryoshka representation), so
 * a 1024-dim index can be served by `text-embedding-3-small` without a
 * separate model.
 *
 * Raw `fetch`, no SDK — consistent with the OcrSpaceProvider precedent and
 * keeps the worker's dependency surface minimal.
 */

const OPENAI_EMBEDDINGS_ENDPOINT = "https://api.openai.com/v1/embeddings";
/** OpenAI accepts up to 2048 inputs per request; stay well under it. */
const DEFAULT_MAX_INPUTS_PER_CALL = 256;

export interface OpenAIEmbeddingProviderOptions {
  apiKey: string;
  model?: string;
  /** Target vector length. Must match the Pinecone index dimension. */
  dimensions?: number;
  timeoutMs?: number;
  maxInputsPerCall?: number;
}

interface OpenAIEmbeddingResponse {
  data?: { embedding?: number[]; index?: number }[];
  model?: string;
  usage?: { prompt_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimension: number;
  readonly maxInputsPerCall: number;

  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIEmbeddingProviderOptions) {
    if (!options.apiKey) {
      throw new Error("OpenAIEmbeddingProvider requires an apiKey");
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? "text-embedding-3-small";
    this.dimension = options.dimensions ?? 1536;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxInputsPerCall = options.maxInputsPerCall ?? DEFAULT_MAX_INPUTS_PER_CALL;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (request.inputs.length === 0) {
      return { vectors: [], model: this.model, dimension: this.dimension, totalTokens: 0 };
    }
    if (request.inputs.length > this.maxInputsPerCall) {
      throw new EmbeddingError(
        `embed() received ${request.inputs.length} inputs, over the ${this.maxInputsPerCall} per-call limit — callers must sub-batch`,
        undefined,
        false,
      );
    }
    if (request.inputs.some((s) => s.length === 0)) {
      throw new EmbeddingError("embed() received an empty-string input", undefined, false);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(OPENAI_EMBEDDINGS_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: request.inputs,
          dimensions: this.dimension,
        }),
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new EmbeddingError(
        aborted ? `OpenAI embeddings timed out after ${this.timeoutMs}ms` : "OpenAI embeddings request failed",
        err,
        true,
      );
    } finally {
      clearTimeout(timer);
    }

    const bodyText = await response.text();
    let parsed: OpenAIEmbeddingResponse;
    try {
      parsed = JSON.parse(bodyText) as OpenAIEmbeddingResponse;
    } catch {
      throw new EmbeddingError(
        `OpenAI embeddings returned non-JSON (HTTP ${response.status})`,
        bodyText.slice(0, 500),
        response.status >= 500 || response.status === 429,
      );
    }

    if (!response.ok || parsed.error) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new EmbeddingError(
        `OpenAI embeddings error (HTTP ${response.status}): ${parsed.error?.message ?? bodyText.slice(0, 300)}`,
        parsed.error,
        retryable,
      );
    }

    const rows = parsed.data ?? [];
    if (rows.length !== request.inputs.length) {
      throw new EmbeddingError(
        `OpenAI returned ${rows.length} vectors for ${request.inputs.length} inputs`,
        undefined,
        false,
      );
    }

    // Restore request order (OpenAI returns an `index` on each row).
    const vectors: number[][] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vector = row?.embedding;
      if (!vector || vector.length !== this.dimension) {
        throw new EmbeddingError(
          `OpenAI vector ${i} has length ${vector?.length ?? 0}, expected ${this.dimension}`,
          undefined,
          false,
        );
      }
      vectors[row.index ?? i] = vector;
    }

    return {
      vectors,
      model: parsed.model ?? this.model,
      dimension: this.dimension,
      totalTokens: parsed.usage?.total_tokens,
    };
  }
}
