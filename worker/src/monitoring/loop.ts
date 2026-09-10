import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { SourceAdapter } from "./types.js";
import { rbiAdapter } from "./adapters/rbi.js";
import { sebiAdapter } from "./adapters/sebi.js";
import { fetchFeed, SourceUnavailableError } from "./rss-processor.js";
import { retrieveViaWebScrape } from "./web-retrieval.js";
import { runWatchdog } from "./watchdog.js";
import { detectNewFiles } from "./new-file-detector.js";
import { processDocument } from "../ingestion/process-document.js";

/** Non-terminal statuses whose documents still need pipeline work. */
const PENDING_STATUSES = ["DETECTED", "RETRIEVED", "OCR_PROCESSING", "SECURED"];

const ADAPTERS: Record<string, SourceAdapter> = {
  RBI: rbiAdapter,
  SEBI: sebiAdapter,
};

interface RegulatorySourceRow {
  id: string;
  code: string;
  rss_feed_url: string | null;
  is_active: boolean;
}

/** Process one source end-to-end. Never throws — logs and returns. */
async function pollSource(
  supabase: WorkerSupabaseClient,
  log: Logger,
  source: RegulatorySourceRow,
  config: Config,
): Promise<void> {
  const sourceLog = log;
  const base = { source: source.code };

  const adapter = ADAPTERS[source.code];
  if (!adapter) {
    sourceLog.warn("no adapter registered for source — skipping", base);
    return;
  }

  try {
    const rawItems = source.rss_feed_url
      ? await fetchFeed(source.rss_feed_url, config.SOURCE_FETCH_TIMEOUT_MS)
      : await retrieveViaWebScrape(source.code);

    sourceLog.info("fetched source feed", {
      ...base,
      path: source.rss_feed_url ? "rss" : "web-scrape",
      rawItemCount: rawItems.length,
    });

    const { candidates, dropped } = adapter.toCandidates(rawItems);
    const { accepted, duplicatesInBatch } = runWatchdog(candidates);

    if (dropped > 0 || duplicatesInBatch > 0) {
      sourceLog.debug("watchdog filtering", { ...base, dropped, duplicatesInBatch });
    }

    // PRD FR-04 "File found?" — NO branch is simply an empty accepted list.
    if (accepted.length === 0) {
      sourceLog.info("no candidate items this cycle", base);
      return;
    }

    const { newDocuments, alreadyKnown } = await detectNewFiles(
      supabase,
      sourceLog,
      source.id,
      accepted,
      config.dryRun,
    );

    sourceLog.info("detection complete", {
      ...base,
      candidates: accepted.length,
      newDocuments: newDocuments.length,
      alreadyKnown,
    });

    for (const doc of newDocuments) {
      sourceLog.info("new regulatory document detected", {
        ...base,
        documentId: doc.id,
        externalReference: doc.externalReference,
        title: doc.title,
      });
    }
    // Ingestion (Phase 5) runs as a single bounded sweep after all sources
    // are polled — see processPendingDocuments in runCycle.
  } catch (err) {
    if (err instanceof SourceUnavailableError) {
      // HLSA §21: source unreachable → log, do not crash, retry next cycle.
      sourceLog.warn("source unavailable — will retry next cycle", {
        ...base,
        url: err.url,
        error: err.cause instanceof Error ? err.cause.message : String(err.cause),
      });
      return;
    }
    sourceLog.error("unexpected error polling source — will retry next cycle", {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Run a single monitoring cycle across all active sources. */
export async function runCycle(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
): Promise<void> {
  const startedAt = Date.now();
  log.info("poll cycle started");

  const { data: sources, error } = await supabase
    .from("regulatory_sources")
    .select("id, code, rss_feed_url, is_active")
    .eq("is_active", true);

  if (error) {
    log.error("failed to load regulatory sources — skipping cycle", { error: error.message });
    return;
  }

  if (!sources || sources.length === 0) {
    log.warn("no active regulatory sources configured");
    return;
  }

  // Sources are independent — a failure in one must not affect the others.
  await Promise.all(
    sources.map((s) => pollSource(supabase, log, s as RegulatorySourceRow, config)),
  );

  await processPendingDocuments(supabase, log, config);

  log.info("poll cycle finished", { durationMs: Date.now() - startedAt });
}

/**
 * Ingestion sweep (Phase 5): take up to INGESTION_BATCH_SIZE documents that
 * aren't yet STORED and run each through retrieve → extract → secure → store,
 * oldest first. Sequential, to keep OCR.space request volume bounded (free
 * tier: 500/day/IP). A per-document failure holds that document for a later
 * retry and does not stop the sweep.
 */
export async function processPendingDocuments(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
): Promise<void> {
  const { data: pending, error } = await supabase
    .from("regulatory_documents")
    .select("id")
    .in("status", PENDING_STATUSES)
    .order("detected_at", { ascending: true })
    .limit(config.INGESTION_BATCH_SIZE);

  if (error) {
    log.error("failed to load pending documents for ingestion", { error: error.message });
    return;
  }
  if (!pending || pending.length === 0) {
    log.debug("no documents pending ingestion");
    return;
  }

  log.info("ingestion sweep starting", { count: pending.length });
  let stored = 0;
  let held = 0;
  for (const row of pending) {
    const result = await processDocument(supabase, log, config, row.id);
    if (result.outcome === "stored") stored++;
    else if (result.outcome === "held") held++;
  }
  log.info("ingestion sweep finished", { attempted: pending.length, stored, held });
}

/**
 * The continuous monitoring loop (PRD FR-02/FR-05). Uses a self-scheduling
 * setTimeout after each cycle *completes*, so cycles never overlap regardless
 * of how long a cycle takes. Runs until `stop()` is called.
 */
export function startLoop(supabase: WorkerSupabaseClient, log: Logger, config: Config) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  async function tick() {
    if (stopped) return;
    try {
      await runCycle(supabase, log, config);
    } catch (err) {
      log.error("poll cycle threw — loop continues", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (!stopped) {
      timer = setTimeout(tick, config.WORKER_POLL_INTERVAL_MS);
    }
  }

  void tick();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
