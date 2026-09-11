/**
 * CLI entry for Demo Run — spawned by the web app's POST /api/demo/run
 * Route Handler as a child process (exactly the same execution model as
 * `worker/src/index.ts --once`, just a different, on-demand trigger instead
 * of the poll timer). Prints one NDJSON line per progress event to stdout;
 * the caller relays those lines to the browser. Internal pipeline logging
 * (createLogger) goes to stdout/stderr as usual and is NOT part of the
 * NDJSON progress contract — the caller filters for `type: "demo-progress"`.
 *
 *   node --import tsx/esm src/demo/run-demo-cli.ts
 */
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

import { loadConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { createWorkerSupabaseClient } from "../supabase.js";
import { runDemoPipeline } from "./run-demo.js";

const log = createLogger("demo-run");

async function main() {
  const config = loadConfig();
  const supabase = createWorkerSupabaseClient(config);
  const demoRunId = `DEMO-${Date.now()}`;

  log.info("demo run starting", { demoRunId });

  for await (const event of runDemoPipeline(supabase, log, config, demoRunId)) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }

  log.info("demo run finished", { demoRunId });
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  log.error("demo run crashed", { error: message });
  process.stdout.write(
    `${JSON.stringify({ type: "demo-progress", demoRunId: "unknown", stage: "error", message: `Demo run crashed: ${message}`, ok: false })}\n`,
  );
  process.exitCode = 1;
});
