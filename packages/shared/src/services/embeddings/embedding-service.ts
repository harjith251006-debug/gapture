import type { EmbeddingProvider } from "./embedding-provider.interface";
import { EmbeddingError } from "./types";

export interface EmbeddingServiceOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * The one thing the pipeline depends on for embeddings — never a concrete
 * provider directly. Adds retry/backoff and transparent sub-batching: a
 * caller passes every chunk of a document at once and gets one vector per
 * text back, in order, regardless of the provider's per-call input cap
 * (still batched — never one HTTP call per chunk).
 */
export class EmbeddingService {
  private readonly provider: EmbeddingProvider;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(provider: EmbeddingProvider, options: EmbeddingServiceOptions = {}) {
    this.provider = provider;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
  }

  get model(): string {
    return this.provider.model;
  }

  get dimension(): number {
    return this.provider.dimension;
  }

  /** Embed every text, preserving order. Returns [] for []. */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const batchSize = this.provider.maxInputsPerCall;
    const out: number[][] = [];
    for (let start = 0; start < texts.length; start += batchSize) {
      const slice = texts.slice(start, start + batchSize);
      const result = await this.embedOneBatchWithRetry(slice);
      out.push(...result);
    }
    return out;
  }

  private async embedOneBatchWithRetry(inputs: string[]): Promise<number[][]> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.provider.embed({ inputs });
        if (attempt > 0) {
          console.log(
            JSON.stringify({
              level: "info",
              component: "EmbeddingService",
              message: "embedding succeeded after retry",
              attempt,
              inputs: inputs.length,
            }),
          );
        }
        return result.vectors;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof EmbeddingError ? err.retryable : true;
        console.error(
          JSON.stringify({
            level: "error",
            component: "EmbeddingService",
            message: "embedding attempt failed",
            attempt,
            retryable,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        if (!retryable || attempt === this.maxRetries) break;
        await new Promise((r) => setTimeout(r, this.baseDelayMs * 2 ** attempt));
      }
    }

    throw lastError instanceof EmbeddingError
      ? lastError
      : new EmbeddingError("embedding failed after all retries", lastError, false);
  }
}
