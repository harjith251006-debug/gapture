import type { EmbeddingRequest, EmbeddingResult } from "./types";

/**
 * The abstraction every embedding vendor implements. `EmbeddingService`
 * depends on this interface only — never on a concrete provider — so the
 * vendor can be swapped without touching the pipeline
 * (docs/IMPLEMENTATION-PLAN.md §8.2).
 *
 * Only one implementation exists today: `OpenAIEmbeddingProvider`.
 */
export interface EmbeddingProvider {
  /** Model identifier, e.g. "text-embedding-3-small". */
  readonly model: string;
  /** Vector length this provider is configured to emit. */
  readonly dimension: number;
  /** Largest number of inputs the provider accepts in one call. */
  readonly maxInputsPerCall: number;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
}
