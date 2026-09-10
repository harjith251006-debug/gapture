import {
  EmbeddingService,
  NlpAnalysisService,
  OpenAIAnalysisProvider,
  OpenAIEmbeddingProvider,
  PineconeClient,
} from "@gapture/shared";
import type { Config } from "../config.js";

/**
 * Cached embedding + Pinecone clients, shared by the regulatory
 * (embed-and-index), policy (policy-pipeline), and analysis sweeps so all
 * hit the same model / index configuration.
 */

export interface EmbeddingClients {
  embeddings: EmbeddingService;
  pinecone: PineconeClient;
}

const cache = new WeakMap<Config, EmbeddingClients>();
const analysisCache = new WeakMap<Config, NlpAnalysisService>();

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

/** Cached NLP analysis service (Phase 9). */
export function getAnalysisService(config: Config): NlpAnalysisService {
  const cached = analysisCache.get(config);
  if (cached) return cached;
  const service = new NlpAnalysisService(
    new OpenAIAnalysisProvider({
      apiKey: config.OPENAI_API_KEY,
      model: config.OPENAI_ANALYSIS_MODEL,
      maxCompletionTokens: config.OPENAI_ANALYSIS_MAX_TOKENS,
      timeoutMs: config.OPENAI_ANALYSIS_TIMEOUT_MS,
    }),
  );
  analysisCache.set(config, service);
  return service;
}
