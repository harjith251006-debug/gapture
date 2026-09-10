import { createAdminClient } from "@gapture/shared";
import type { Config } from "./config.js";

export function createWorkerSupabaseClient(config: Config) {
  return createAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
}

export type WorkerSupabaseClient = ReturnType<typeof createWorkerSupabaseClient>;
