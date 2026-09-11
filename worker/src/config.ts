import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  SOURCE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OCR_SPACE_API_KEY: z.string().min(1),
  OCR_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DOCUMENT_ENCRYPTION_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  /** Must equal the Pinecone index dimension. gaptureai index = 1024. */
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
  OPENAI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Chat model for regulatory-vs-policy analysis (Phase 9). gpt-5 family. */
  OPENAI_ANALYSIS_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_ANALYSIS_MAX_TOKENS: z.coerce.number().int().positive().default(6000),
  OPENAI_ANALYSIS_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX_HOST: z.string().url(),
  PINECONE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Pinecone namespace for regulatory-document vectors (policies use their own). */
  PINECONE_NAMESPACE_REGULATORY: z.string().default("regulatory"),
  /** Pinecone namespace for company compliance-policy vectors. */
  PINECONE_NAMESPACE_POLICY: z.string().default("policy"),
  /** Max original-file size the worker will retrieve+store, in bytes. */
  MAX_DOCUMENT_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  /** How many DETECTED-backlog documents to process per cycle (bounds OCR.space usage). */
  INGESTION_BATCH_SIZE: z.coerce.number().int().positive().default(5),
  /** How many STORED documents to clean + chunk per cycle (pure CPU, no external limits). */
  CLEANING_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  /** How many INDEXING documents to embed + upsert to Pinecone per cycle. */
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(5),
  /** How many uploaded/in-flight compliance policies to process per cycle. */
  POLICY_BATCH_SIZE: z.coerce.number().int().positive().default(3),
  /** How many ANALYZING documents to run NLP analysis on per cycle (one LLM call per org). */
  ANALYSIS_BATCH_SIZE: z.coerce.number().int().positive().default(3),
  /** Top-k policy chunks retrieved from Pinecone as grounding context per org. */
  ANALYSIS_CONTEXT_TOPK: z.coerce.number().int().positive().default(8),
  /** Max characters of regulatory text put into the analysis prompt. */
  ANALYSIS_MAX_REG_CHARS: z.coerce.number().int().positive().default(12_000),
  /** How many recently-COMPLETED documents to check for missing notifications per cycle. */
  NOTIFICATION_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  NODE_ENV: z.string().default("development"),
});

export interface Config extends z.infer<typeof schema> {
  /** --dry-run: fetch, parse, and diff against the DB, but write nothing. */
  dryRun: boolean;
  /** --once: run a single cycle then exit. */
  runOnce: boolean;
}

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid worker environment:\n${issues}\n\nSee worker/.env.example`);
  }
  return {
    ...parsed.data,
    dryRun: process.argv.includes("--dry-run"),
    runOnce: process.argv.includes("--once") || process.argv.includes("--dry-run"),
  };
}
