/**
 * Minimal Pinecone types — only what `upsert` and `query` need. No other
 * Pinecone SDK surface is exposed to callers
 * (docs/IMPLEMENTATION-PLAN.md §17 task 2).
 */

/** Metadata kept alongside a vector. Deliberately tiny: identifiers only, */
/** never transactional text like title/status (DB Schema §37). */
export type PineconeMetadata = Record<string, string | number | boolean>;

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: PineconeMetadata;
}

export interface PineconeQuery {
  vector: number[];
  topK: number;
  namespace?: string;
  includeMetadata?: boolean;
  filter?: Record<string, unknown>;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class PineconeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "PineconeError";
  }
}
