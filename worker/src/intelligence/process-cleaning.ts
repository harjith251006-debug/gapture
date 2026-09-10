import { deriveKey, decrypt } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";
import { cleanDocumentText } from "./clean.js";
import { chunkText } from "./chunk.js";

interface StoredDocumentRow {
  id: string;
  external_reference: string | null;
  status: string;
  storage_bucket: string | null;
  storage_path: string | null;
}

export interface CleaningResult {
  documentId: string;
  outcome: "cleaned" | "held" | "skipped";
  chunkCount?: number;
  cleanedChars?: number;
  reason?: string;
}

/** `.../original.enc` -> `.../extracted.enc` (the Phase 5 text sidecar). */
function extractedTextPath(storagePath: string): string {
  return storagePath.replace(/original\.enc$/, "extracted.enc");
}

async function recordErrorEvent(
  supabase: WorkerSupabaseClient,
  documentId: string,
  status: string,
  message: string,
): Promise<void> {
  await supabase
    .from("document_processing_events")
    .insert({ document_id: documentId, status, error_message: message });
}

/**
 * Phase 6 pipeline for one document: decrypt the Phase 5 `extracted.enc`
 * sidecar -> clean -> chunk -> batch-insert `document_chunks` -> advance
 * STORED -> CLEANING -> INDEXING. Never throws: on failure it records an error
 * event, leaves the document at its last good status for a later retry, and
 * returns. Ends at INDEXING; Phase 7 (embeddings) picks up the PENDING chunks.
 */
export async function cleanAndChunkDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  documentId: string,
): Promise<CleaningResult> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select("id, external_reference, status, storage_bucket, storage_path")
    .eq("id", documentId)
    .single();

  if (error || !data) {
    log.error("cannot load document for cleaning", { documentId, error: error?.message });
    return { documentId, outcome: "skipped", reason: "not found" };
  }

  const doc = data as StoredDocumentRow;
  const base = { documentId, externalReference: doc.external_reference };

  if (["INDEXING", "ANALYZING", "COMPLETED"].includes(doc.status)) {
    return { documentId, outcome: "skipped", reason: `already at ${doc.status}` };
  }
  if (!["STORED", "CLEANING"].includes(doc.status)) {
    return { documentId, outcome: "skipped", reason: `not ready (status ${doc.status})` };
  }
  if (!doc.storage_bucket || !doc.storage_path) {
    await recordErrorEvent(supabase, documentId, doc.status, "STORED document has no storage path");
    return { documentId, outcome: "held", reason: "missing storage path" };
  }

  try {
    await supabase.rpc("advance_document_status", {
      p_document_id: documentId,
      p_new_status: "CLEANING",
    });

    // --- Decrypt the Phase 5 extracted-text sidecar ----------------------
    const sidecarPath = extractedTextPath(doc.storage_path);
    const { data: blob, error: dlError } = await supabase.storage
      .from(doc.storage_bucket)
      .download(sidecarPath);
    if (dlError || !blob) {
      throw new Error(`Cannot download extracted-text sidecar ${sidecarPath}: ${dlError?.message}`);
    }
    const key = deriveKey(config.DOCUMENT_ENCRYPTION_KEY);
    const rawText = decrypt(Buffer.from(await blob.arrayBuffer()), key).toString("utf8");

    // --- Clean + chunk --------------------------------------------------
    const cleaned = cleanDocumentText(rawText);
    if (!cleaned) {
      await recordErrorEvent(
        supabase,
        documentId,
        "CLEANING",
        "Extracted text was empty after cleaning - nothing to chunk",
      );
      log.warn("nothing to chunk after cleaning - held", base);
      return { documentId, outcome: "held", reason: "empty after cleaning" };
    }

    const chunks = chunkText(cleaned);
    if (chunks.length === 0) {
      await recordErrorEvent(supabase, documentId, "CLEANING", "Chunker produced no chunks");
      return { documentId, outcome: "held", reason: "no chunks produced" };
    }

    // --- Persist: replace any prior chunks, then one batched INSERT -----
    // (DB Schema section 33 - never one INSERT per chunk.)
    const { error: delError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);
    if (delError) throw new Error(`Failed to clear existing chunks: ${delError.message}`);

    const rows = chunks.map((content, chunk_index) => ({
      document_id: documentId,
      chunk_index,
      content,
      embedding_status: "PENDING" as const,
    }));
    const { error: insError } = await supabase.from("document_chunks").insert(rows);
    if (insError) throw new Error(`Batch chunk insert failed: ${insError.message}`);

    // --- Ready for embedding ------------------------------------------
    const { error: rpcError } = await supabase.rpc("advance_document_status", {
      p_document_id: documentId,
      p_new_status: "INDEXING",
    });
    if (rpcError) throw new Error(`Failed to mark document INDEXING: ${rpcError.message}`);

    log.info("document cleaned and chunked", {
      ...base,
      chunkCount: chunks.length,
      cleanedChars: cleaned.length,
      rawChars: rawText.length,
    });
    return {
      documentId,
      outcome: "cleaned",
      chunkCount: chunks.length,
      cleanedChars: cleaned.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const { data: current } = await supabase
      .from("regulatory_documents")
      .select("status")
      .eq("id", documentId)
      .single();
    await recordErrorEvent(supabase, documentId, current?.status ?? "STORED", message);
    log.error("document cleaning failed - held for retry", { ...base, error: message });
    return { documentId, outcome: "held", reason: message };
  }
}
