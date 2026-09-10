import { EmbeddingService, OpenAIEmbeddingProvider, PineconeClient } from "@gapture/shared";
import type { Config } from "../config.js";

/**
 * Cached embedding + Pinecone clients, shared by the regulatory
 * (embed-and-index) and policy (policy-pipeline) sweeps so both hit the same
 * model / index configuration.
 */

export interface EmbeddingClients {
  embeddings: EmbeddingService;
  pinecone: PineconeClient;
}

const cache = new WeakMap<Config, EmbeddingClients>();

export function getEmbeddingClients(config: Config): EmbeddingClients {
  const cached = cache.get(config);
  if (cached) return cached;
  const clients: EmbeddingClients = {
    embeddings: new EmbeddingService(
      new OpenAIEmbeddingProvider({
        apiKey: config.OPENAI_API_KEY,
        model: config.OPENAI_EMBEDDING_MODEL,
        dimensions: config.OPENAI_EMBEDDING_DIMENSIONS,
        timeoutMs: config.OPENAI_REQUEST_TIMEOUT_MS,
      }),
    ),
    pinecone: new PineconeClient({
      apiKey: config.PINECONE_API_KEY,
      indexHost: config.PINECONE_INDEX_HOST,
      timeoutMs: config.PINECONE_REQUEST_TIMEOUT_MS,
    }),
  };
  cache.set(config, clients);
  return clients;
}
