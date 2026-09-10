import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  SOURCE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
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
