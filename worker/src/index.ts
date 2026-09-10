import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createWorkerSupabaseClient } from "./supabase.js";
import { runCycle, startLoop } from "./monitoring/loop.js";

const log = createLogger("worker");

async function main() {
  const config = loadConfig();
  const supabase = createWorkerSupabaseClient(config);

  log.info("gapture monitoring worker starting", {
    mode: config.dryRun ? "dry-run" : config.runOnce ? "once" : "loop",
    pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
  });

  if (config.runOnce) {
    await runCycle(supabase, log, config);
    log.info("single cycle complete — exiting", { dryRun: config.dryRun });
    return;
  }

  const loop = startLoop(supabase, log, config);

  const shutdown = (signal: string) => {
    log.info("shutdown signal received — stopping loop", { signal });
    loop.stop();
    // Give any in-flight cycle a moment to settle, then exit.
    setTimeout(() => process.exit(0), 2_000);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("worker failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
