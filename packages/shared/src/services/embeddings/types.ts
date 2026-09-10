/**
 * Provider-agnostic embedding types. Nothing here names OpenAI specifically,
 * so callers stay decoupled from the concrete provider
 * (docs/IMPLEMENTATION-PLAN.md §8.2, mirroring the OCR abstraction).
 */

export interface EmbeddingRequest {
  /** One string per item to embed. Order is preserved in the result. */
  inputs: string[];
}

export interface EmbeddingResult {
  /** One vector per input, in the same order. */
  vectors: number[][];
  /** Model identifier the provider actually used. */
  model: string;
  /** Length of every vector in `vectors`. */
  dimension: number;
  /** Provider-reported token usage, when available (logging only). */
  totalTokens?: number;
}

/**
 * Thrown by a provider (or EmbeddingService, after retries are exhausted) so
 * callers can distinguish a structured embedding failure from an unexpected
 * exception. `retryable` drives the worker's hold-and-retry behaviour.
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}
