import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import type { WorkerSupabaseClient } from "../supabase.js";
import { rbiAdapter } from "../monitoring/adapters/rbi.js";
import { sebiAdapter } from "../monitoring/adapters/sebi.js";
import { fetchFeed } from "../monitoring/rss-processor.js";
import { runWatchdog } from "../monitoring/watchdog.js";
import type { CandidateItem, SourceAdapter } from "../monitoring/types.js";
import { processDocument } from "../ingestion/process-document.js";
import { cleanAndChunkDocument } from "../intelligence/process-cleaning.js";
import { embedAndIndexDocument } from "../intelligence/embed-and-index.js";
import { runAnalysisForDocument } from "../analysis/run-analysis.js";
import { createNotificationsForDocument } from "../analysis/create-notification.js";

/**
 * Demo Run — a manual, on-demand ENTRY POINT only. It feeds the latest live
 * RBI and SEBI RSS item through the exact same production functions the
 * continuous poll loop uses:
 *
 *   processDocument -> cleanAndChunkDocument -> embedAndIndexDocument ->
 *   runAnalysisForDocument -> createNotificationsForDocument
 *
 * No second OCR/NLP/analysis pipeline exists. The only new logic here is (a)
 * fetching "the latest item" on demand instead of waiting for the poll
 * timer, and (b) inserting it under a demo-tagged identity so it can be
 * replayed and cleaned up without ever touching production rows.
 *
 * Demo tagging is a NAMING CONVENTION, not a schema change:
 *   external_reference = "<real-external-reference>-<demoRunId>"
 *   title              = "[DEMO] <real title>"
 * The partial unique index on (source_id, external_reference) already only
 * applies to non-null values and is untouched — a demo row's reference never
 * collides with the real item's own row, and normal production
 * deduplication is neither disabled nor bypassed for anything but this
 * deliberately-namespaced demo key space.
 */

const ADAPTERS: Record<"RBI" | "SEBI", SourceAdapter> = { RBI: rbiAdapter, SEBI: sebiAdapter };
const DEMO_TAG_RE = /-DEMO-\d+$/;

export interface DemoProgressEvent {
  type: "demo-progress";
  demoRunId: string;
  stage: string;
  message: string;
  source?: "RBI" | "SEBI";
  ok?: boolean;
}

export interface DemoSourceOutcome {
  source: "RBI" | "SEBI";
  ok: boolean;
  documentId?: string;
  externalReference?: string;
  title?: string;
  finalStatus?: string;
  error?: string;
}

export interface DemoRunSummary {
  demoRunId: string;
  clearedPreviousDocuments: number;
  sources: DemoSourceOutcome[];
}

function progress(
  demoRunId: string,
  stage: string,
  message: string,
  extra: Partial<Omit<DemoProgressEvent, "type" | "demoRunId" | "stage" | "message">> = {},
): DemoProgressEvent {
  return { type: "demo-progress", demoRunId, stage, message, ...extra };
}

/**
 * Remove only demo-tagged records from a previous run — identified purely by
 * the `-DEMO-<timestamp>` suffix on `external_reference`. Never touches a
 * row without that suffix, so production history is untouched by
 * construction, not by a status flag that could be forgotten.
 */
export async function clearPreviousDemoRuns(supabase: WorkerSupabaseClient, log: Logger): Promise<number> {
  const { data: candidates, error } = await supabase
    .from("regulatory_documents")
    .select("id, external_reference, storage_bucket, storage_path")
    .like("external_reference", "%-DEMO-%");
  if (error) throw new Error(`failed to list previous demo documents: ${error.message}`);

  const rows = (candidates ?? []).filter((r) => DEMO_TAG_RE.test(r.external_reference ?? ""));
  if (rows.length === 0) return 0;

  const ids = rows.map((r) => r.id);

  // notifications.document_id is ON DELETE RESTRICT — must be cleared before
  // the parent regulatory_documents row.
  const { error: notifErr } = await supabase.from("notifications").delete().in("document_id", ids);
  if (notifErr) throw new Error(`failed to clear previous demo notifications: ${notifErr.message}`);

  for (const r of rows) {
    if (r.storage_path) {
      await supabase.storage
        .from(r.storage_bucket ?? "regulatory-documents")
        .remove([r.storage_path, r.storage_path.replace(/original\.enc$/, "extracted.enc")]);
    }
  }

  // document_chunks / nlp_analyses / contextual_interactions /
  // document_processing_events all have ON DELETE CASCADE to
  // regulatory_documents — one delete clears the rest.
  const { error: delErr } = await supabase.from("regulatory_documents").delete().in("id", ids);
  if (delErr) throw new Error(`failed to delete previous demo documents: ${delErr.message}`);

  log.info("cleared previous demo runs", { count: rows.length });
  return rows.length;
}

async function fetchLatestCandidate(
  supabase: WorkerSupabaseClient,
  config: Config,
  code: "RBI" | "SEBI",
): Promise<{ sourceId: string; latest: CandidateItem }> {
  const { data: source, error } = await supabase
    .from("regulatory_sources")
    .select("id, rss_feed_url")
    .eq("code", code)
    .single();
  if (error || !source) throw new Error(`regulatory_sources row for ${code} not found: ${error?.message}`);
  if (!source.rss_feed_url) throw new Error(`${code} has no configured RSS feed URL`);

  // Reused verbatim from the production poll path (rss-processor.ts, the
  // matching adapter, watchdog.ts) — identical parsing/filtering behaviour.
  const rawItems = await fetchFeed(source.rss_feed_url, config.SOURCE_FETCH_TIMEOUT_MS);
  const { candidates } = ADAPTERS[code].toCandidates(rawItems);
  const { accepted } = runWatchdog(candidates);
  const latest = accepted[0];
  if (!latest) throw new Error(`no usable items found in the ${code} feed right now`);
  return { sourceId: source.id as string, latest };
}

/** Insert the demo-tagged row. Deliberately bypasses new-file-detector.ts's dedup — replay is the point. */
async function insertDemoDocument(
  supabase: WorkerSupabaseClient,
  sourceId: string,
  demoRunId: string,
  candidate: CandidateItem,
): Promise<{ id: string; externalReference: string; title: string }> {
  const { data: inserted, error } = await supabase
    .from("regulatory_documents")
    .insert({
      source_id: sourceId,
      external_reference: `${candidate.externalReference}-${demoRunId}`,
      title: `[DEMO] ${candidate.title}`,
      source_url: candidate.sourceUrl,
      file_url: candidate.fileUrl ?? null,
      published_at: candidate.publishedAt?.toISOString() ?? null,
      status: "DETECTED",
    })
    .select("id, external_reference, title")
    .single();
  if (error || !inserted) throw new Error(`failed to insert demo document: ${error?.message}`);

  await supabase.from("document_processing_events").insert({
    document_id: inserted.id,
    status: "DETECTED",
    error_message: null,
  });

  return { id: inserted.id, externalReference: inserted.external_reference, title: inserted.title };
}

/**
 * Run the shared production pipeline, stage by stage, on one document.
 * Stops and reports the real reason the moment a stage doesn't reach its
 * success outcome — never treats a held/failed stage as success.
 */
async function runPipelineOnDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  documentId: string,
): Promise<{ ok: boolean; finalStatus?: string; error?: string; analyzed: boolean }> {
  const ing = await processDocument(supabase, log, config, documentId);
  if (ing.outcome !== "stored") {
    return { ok: false, analyzed: false, error: `ingestion/OCR: ${ing.reason ?? ing.outcome}` };
  }

  const clean = await cleanAndChunkDocument(supabase, log, config, documentId);
  if (clean.outcome !== "cleaned") {
    return { ok: false, analyzed: false, error: `cleaning/chunking: ${clean.reason ?? clean.outcome}` };
  }

  const embed = await embedAndIndexDocument(supabase, log, config, documentId);
  if (embed.outcome !== "indexed") {
    return { ok: false, analyzed: false, error: `embedding: ${embed.reason ?? embed.outcome}` };
  }

  const analysis = await runAnalysisForDocument(supabase, log, config, documentId);
  const noPolicies = analysis.outcome === "held" && analysis.reason === "no organizations with policies";
  if (analysis.outcome !== "analyzed" && !noPolicies) {
    return { ok: false, analyzed: false, error: `NLP analysis: ${analysis.reason ?? analysis.outcome}` };
  }

  if (!noPolicies) {
    const notif = await createNotificationsForDocument(supabase, log, documentId);
    if (notif.outcome !== "created" && notif.outcome !== "noop") {
      return { ok: false, analyzed: true, error: `notifications: ${notif.reason ?? notif.outcome}` };
    }
  }

  const { data: finalDoc } = await supabase
    .from("regulatory_documents")
    .select("status")
    .eq("id", documentId)
    .single();

  return { ok: true, analyzed: !noPolicies, finalStatus: finalDoc?.status };
}

/**
 * The full demo orchestration, yielding one progress event per real step so
 * a caller can stream it live. RBI and SEBI are processed sequentially and
 * independently — a failure on one is reported and does not stop the other
 * (matches the production poll's per-source isolation).
 */
export async function* runDemoPipeline(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  demoRunId: string,
): AsyncGenerator<DemoProgressEvent, DemoRunSummary> {
  yield progress(demoRunId, "start", "Starting demo...");

  const clearedPreviousDocuments = await clearPreviousDemoRuns(supabase, log);

  const sources: DemoSourceOutcome[] = [];

  for (const code of ["RBI", "SEBI"] as const) {
    yield progress(demoRunId, "fetch", `Fetching ${code}...`, { source: code });

    let sourceId: string;
    let candidate: CandidateItem;
    try {
      const result = await fetchLatestCandidate(supabase, config, code);
      sourceId = result.sourceId;
      candidate = result.latest;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("demo: failed to fetch latest item", { source: code, error: message });
      yield progress(demoRunId, "fetch", `${code} fetch failed: ${message}`, { source: code, ok: false });
      sources.push({ source: code, ok: false, error: message });
      continue;
    }
    yield progress(demoRunId, "fetch", `${code} document found: "${candidate.title}"`, { source: code, ok: true });

    let doc: { id: string; externalReference: string; title: string };
    try {
      doc = await insertDemoDocument(supabase, sourceId, demoRunId, candidate);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("demo: failed to create demo document", { source: code, error: message });
      yield progress(demoRunId, "insert", `${code} could not be queued: ${message}`, { source: code, ok: false });
      sources.push({ source: code, ok: false, error: message });
      continue;
    }

    yield progress(demoRunId, "processing", `Processing ${code}...`, { source: code });
    const result = await runPipelineOnDocument(supabase, log, config, doc.id);

    if (!result.ok) {
      yield progress(demoRunId, "processing", `${code} processing failed: ${result.error}`, {
        source: code,
        ok: false,
      });
      sources.push({
        source: code,
        ok: false,
        documentId: doc.id,
        externalReference: doc.externalReference,
        title: doc.title,
        error: result.error,
      });
      continue;
    }

    yield progress(demoRunId, "ocr", "OCR completed", { source: code, ok: true });
    if (result.analyzed) {
      yield progress(demoRunId, "nlp", "NLP analysis completed", { source: code, ok: true });
      yield progress(demoRunId, "notify", "Notifications generated", { source: code, ok: true });
    } else {
      yield progress(
        demoRunId,
        "nlp",
        "NLP analysis skipped — no organization has compliance policies uploaded yet",
        { source: code, ok: true },
      );
    }

    sources.push({
      source: code,
      ok: true,
      documentId: doc.id,
      externalReference: doc.externalReference,
      title: doc.title,
      finalStatus: result.finalStatus,
    });
  }

  yield progress(demoRunId, "done", "Demo completed", {
    ok: sources.every((s) => s.ok),
  });

  return { demoRunId, clearedPreviousDocuments, sources };
}
