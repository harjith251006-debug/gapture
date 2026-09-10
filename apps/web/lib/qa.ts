import {
  ContextualQaService,
  EmbeddingService,
  OpenAIEmbeddingProvider,
  PineconeClient,
} from "@gapture/shared";
import { createAdmin } from "@/lib/supabase/admin";

/**
 * Build the Contextual Q&A service from server env. Uses the service-role
 * Supabase client (chunk resolution + `contextual_interactions` insert are
 * privileged), the OpenAI embeddings model, and the Pinecone index — the
 * same configuration the worker uses, so `/api/qa` retrieves from exactly
 * the vectors Phases 7–8 wrote.
 */
export function createContextualQaService(): ContextualQaService {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeHost = process.env.PINECONE_INDEX_HOST;
  if (!openaiApiKey || !pineconeApiKey || !pineconeHost) {
    throw new Error("Q&A is not configured: OPENAI_API_KEY / PINECONE_API_KEY / PINECONE_INDEX_HOST missing");
  }

  const embeddings = new EmbeddingService(
    new OpenAIEmbeddingProvider({
      apiKey: openaiApiKey,
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      dimensions: Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 1024,
    }),
  );
  const pinecone = new PineconeClient({ apiKey: pineconeApiKey, indexHost: pineconeHost });

  return new ContextualQaService(createAdmin(), embeddings, pinecone, {
    apiKey: openaiApiKey,
    model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
    regulatoryNamespace: process.env.PINECONE_NAMESPACE_REGULATORY ?? "regulatory",
    policyNamespace: process.env.PINECONE_NAMESPACE_POLICY ?? "policy",
    topK: Number(process.env.QA_TOP_K) || 6,
    minScore: process.env.QA_MIN_SCORE ? Number(process.env.QA_MIN_SCORE) : undefined,
  });
}
