import {
  PineconeError,
  type PineconeMatch,
  type PineconeQuery,
  type PineconeVector,
} from "./types";

/**
 * Thin Pinecone data-plane wrapper (HLSA AD-07). Exposes `upsert` and
 * `query` only — no other Pinecone surface leaks into calling code
 * (docs/IMPLEMENTATION-PLAN.md §17 task 2).
 *
 * Raw `fetch` against the index host, no SDK — consistent with the other
 * providers in this package. Retry/backoff on transient (429 / 5xx /
 * network) failures is built in, since there is no separate "service" layer
 * planned for Pinecone the way there is for OCR and embeddings.
 */

const PINECONE_API_VERSION = "2025-01";
/** Pinecone recommends <= 1000 vectors per upsert; stay under it. */
const MAX_VECTORS_PER_UPSERT = 200;

export interface PineconeClientOptions {
  apiKey: string;
  /** Full index host, e.g. https://<index>-<proj>.svc.<region>.pinecone.io */
  indexHost: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

interface UpsertResponse {
  upsertedCount?: number;
}
interface QueryResponse {
  matches?: { id?: string; score?: number; metadata?: Record<string, unknown> }[];
}

export class PineconeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(options: PineconeClientOptions) {
    if (!options.apiKey) throw new Error("PineconeClient requires an apiKey");
    if (!options.indexHost) throw new Error("PineconeClient requires an indexHost");
    this.apiKey = options.apiKey;
    this.baseUrl = options.indexHost.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
  }

  /** Upsert vectors into a namespace. Sub-batches internally; still one call per batch, never one per vector. */
  async upsert(vectors: PineconeVector[], namespace = ""): Promise<{ upsertedCount: number }> {
    let upsertedCount = 0;
    for (let start = 0; start < vectors.length; start += MAX_VECTORS_PER_UPSERT) {
      const batch = vectors.slice(start, start + MAX_VECTORS_PER_UPSERT);
      const res = (await this.request("/vectors/upsert", { vectors: batch, namespace })) as UpsertResponse;
      upsertedCount += res.upsertedCount ?? batch.length;
    }
    return { upsertedCount };
  }

  async query(query: PineconeQuery): Promise<PineconeMatch[]> {
    const res = (await this.request("/query", {
      vector: query.vector,
      topK: query.topK,
      namespace: query.namespace ?? "",
      includeMetadata: query.includeMetadata ?? true,
      includeValues: false,
      filter: query.filter,
    })) as QueryResponse;

    return (res.matches ?? []).map((m) => ({
      id: m.id ?? "",
      score: m.score ?? 0,
      metadata: m.metadata,
    }));
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Api-Key": this.apiKey,
            "Content-Type": "application/json",
            "X-Pinecone-API-Version": PINECONE_API_VERSION,
          },
          body: JSON.stringify(body),
        });
        const text = await response.text();

        if (response.ok) {
          return text ? JSON.parse(text) : {};
        }

        const retryable = response.status === 429 || response.status >= 500;
        const err = new PineconeError(
          `Pinecone ${path} error (HTTP ${response.status}): ${text.slice(0, 300)}`,
          undefined,
          retryable,
        );
        if (!retryable || attempt === this.maxRetries) throw err;
        lastError = err;
      } catch (err) {
        if (err instanceof PineconeError && !err.retryable) throw err;
        const aborted = err instanceof Error && err.name === "AbortError";
        lastError = aborted
          ? new PineconeError(`Pinecone ${path} timed out after ${this.timeoutMs}ms`, err, true)
          : err instanceof PineconeError
            ? err
            : new PineconeError(`Pinecone ${path} request failed`, err, true);
        if (attempt === this.maxRetries) break;
      } finally {
        clearTimeout(timer);
      }
      await new Promise((r) => setTimeout(r, this.baseDelayMs * 2 ** attempt));
    }

    throw lastError instanceof PineconeError
      ? lastError
      : new PineconeError("Pinecone request failed after all retries", lastError, false);
  }
}
