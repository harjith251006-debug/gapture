import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  SOURCE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OCR_SPACE_API_KEY: z.string().min(1),
  OCR_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DOCUMENT_ENCRYPTION_KEY: z.string().min(1),
  /** Max original-file size the worker will retrieve+store, in bytes. */
  MAX_DOCUMENT_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  /** How many DETECTED-backlog documents to process per cycle (bounds OCR.space usage). */
  INGESTION_BATCH_SIZE: z.coerce.number().int().positive().default(5),
  /** How many STORED documents to clean + chunk per cycle (pure CPU, no external limits). */
  CLEANING_BATCH_SIZE: z.coerce.number().int().positive().default(10),
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
