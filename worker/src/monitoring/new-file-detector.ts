import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { CandidateItem } from "./types.js";

export interface DetectedDocument {
  id: string;
  externalReference: string;
  title: string;
}

export interface DetectionResult {
  newDocuments: DetectedDocument[];
  alreadyKnown: number;
}

/**
 * New File Detector (PRD FR-04). Idempotent by construction:
 *   1. Look up which candidate externalReferences already exist for this
 *      source (bounded query — only checks the current cycle's refs).
 *   2. INSERT only the genuinely new ones, at status DETECTED, each with a
 *      matching document_processing_events row.
 *   3. A unique-violation (23505) from a genuine race against the partial
 *      unique index `uq_regdocs_source_extref` is swallowed as "already
 *      known", never surfaced as an error (DB Schema §32).
 *
 * The handoff to Phase 5 (retrieval → OCR → …) happens on the returned
 * `newDocuments`; that pipeline does not exist yet.
 */
export async function detectNewFiles(
  supabase: WorkerSupabaseClient,
  log: Logger,
  sourceId: string,
  candidates: CandidateItem[],
  dryRun = false,
): Promise<DetectionResult> {
  if (candidates.length === 0) {
    return { newDocuments: [], alreadyKnown: 0 };
  }

  const refs = candidates.map((c) => c.externalReference);

  const { data: existing, error: existingError } = await supabase
    .from("regulatory_documents")
    .select("external_reference")
    .eq("source_id", sourceId)
    .in("external_reference", refs);

  if (existingError) {
    throw new Error(`Failed to check existing documents: ${existingError.message}`);
  }

  const known = new Set((existing ?? []).map((r) => r.external_reference));
  const fresh = candidates.filter((c) => !known.has(c.externalReference));

  if (fresh.length === 0) {
    return { newDocuments: [], alreadyKnown: candidates.length };
  }

  if (dryRun) {
    log.info("dry-run: would insert new documents", {
      count: fresh.length,
      externalReferences: fresh.map((c) => c.externalReference),
    });
    return {
      newDocuments: fresh.map((c) => ({
        id: "(dry-run)",
        externalReference: c.externalReference,
        title: c.title,
      })),
      alreadyKnown: candidates.length - fresh.length,
    };
  }

  const newDocuments: DetectedDocument[] = [];

  for (const candidate of fresh) {
    const { data: inserted, error: insertError } = await supabase
      .from("regulatory_documents")
      .insert({
        source_id: sourceId,
        external_reference: candidate.externalReference,
        title: candidate.title,
        source_url: candidate.sourceUrl,
        file_url: candidate.fileUrl ?? null,
        published_at: candidate.publishedAt?.toISOString() ?? null,
        status: "DETECTED",
      })
      .select("id, external_reference, title")
      .single();

    if (insertError) {
      // 23505 = unique_violation: another cycle/instance already inserted it.
      if (insertError.code === "23505") {
        log.debug("candidate already inserted by a concurrent cycle", {
          externalReference: candidate.externalReference,
        });
        continue;
      }
      throw new Error(
        `Failed to insert regulatory_document ${candidate.externalReference}: ${insertError.message}`,
      );
    }

    const { error: eventError } = await supabase.from("document_processing_events").insert({
      document_id: inserted.id,
      status: "DETECTED",
      error_message: null,
    });
    if (eventError) {
      log.warn("failed to write DETECTED processing event", {
        documentId: inserted.id,
        error: eventError.message,
      });
    }

    newDocuments.push({
      id: inserted.id,
      externalReference: inserted.external_reference,
      title: inserted.title,
    });
  }

  return { newDocuments, alreadyKnown: candidates.length - newDocuments.length };
}
