import { deriveKey, decrypt, EmbeddingError, PineconeError, type PineconeVector } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";
import { getOcrService } from "../ingestion/ocr.js";
import { cleanDocumentText } from "./clean.js";
import { chunkText } from "./chunk.js";
import { getEmbeddingClients } from "./clients.js";

/**
 * Phase 8 — company compliance policy processing. This is the policy side of
 * the RAG pipeline and it REUSES the regulatory components wherever the work
 * is genuinely identical: `cleanDocumentText` / `chunkText` (Phase 6), the
 * OCR service (Phase 5), and the shared EmbeddingService / PineconeClient
 * (Phase 7). Only the orchestration and persistence differ, because policies
 * live in different tables (`compliance_policies` / `policy_chunks`), use a
 * different status enum (no SECURED/STORED, no processing-events), and index
 * into their own Pinecone namespace with org-scoped metadata.
 *
 * One document, end to end: UPLOADED -> CLEANING -> INDEXING -> COMPLETED.
 * Never throws — a failure leaves the policy at its last status for a retry
 * next cycle (HLSA §21). Nothing here marks FAILED automatically.
 */

interface PolicyRow {
  id: string;
  organization_id: string;
  status: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
}

interface PolicyChunkRow {
  id: string;
  chunk_index: number;
  content: string;
}

export interface PolicyResult {
  policyId: string;
  outcome: "completed" | "held" | "skipped";
  chunkCount?: number;
  vectorsUpserted?: number;
  reason?: string;
}

const OCR_SPACE_MAX_BYTES = 1024 * 1024; // free tier
const MAX_POLICY_TEXT_BYTES = 5 * 1024 * 1024;

function vectorId(policyId: string, chunkIndex: number): string {
  return `${policyId}:${chunkIndex}`;
}

/** Extract machine-readable text from the decrypted original policy file. */
async function extractPolicyText(
  bytes: Buffer,
  mimeType: string | null,
  policyId: string,
  config: Config,
): Promise<string> {
  const isPdf = mimeType === "application/pdf" || bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  const isImage = (mimeType ?? "").startsWith("image/");

  if (isPdf || isImage) {
    if (bytes.byteLength > OCR_SPACE_MAX_BYTES) {
      throw new Error(
        `Policy file is ${bytes.byteLength} bytes, over OCR.space's 1 MB free-tier limit — needs a paid OCR tier or PDF splitting`,
      );
    }
    const result = await getOcrService(config).extractText({
      fileBuffer: bytes,
      mimeType: isPdf ? "application/pdf" : (mimeType ?? "image/png"),
      filename: `${policyId}${isPdf ? ".pdf" : ".png"}`,
    });
    return result.text;
  }

  // Treat everything else as UTF-8 text (text/plain, text/markdown, ...).
  if (bytes.byteLength > MAX_POLICY_TEXT_BYTES) {
    throw new Error(`Policy text file is ${bytes.byteLength} bytes, over the ${MAX_POLICY_TEXT_BYTES} limit`);
  }
  return bytes.toString("utf8");
}

export async function processPolicyDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  policyId: string,
): Promise<PolicyResult> {
  const { data, error } = await supabase
    .from("compliance_policies")
    .select("id, organization_id, status, storage_bucket, storage_path, mime_type")
    .eq("id", policyId)
    .single();

  if (error || !data) {
    log.error("cannot load policy for processing", { policyId, error: error?.message });
    return { policyId, outcome: "skipped", reason: "not found" };
  }

  const policy = data as PolicyRow;
  const base = { policyId, organizationId: policy.organization_id };

  if (["COMPLETED", "FAILED"].includes(policy.status)) {
    return { policyId, outcome: "skipped", reason: `already at ${policy.status}` };
  }
  if (!["UPLOADED", "CLEANING", "INDEXING"].includes(policy.status)) {
    return { policyId, outcome: "skipped", reason: `unexpected status ${policy.status}` };
  }

  const setStatus = (status: string) =>
    supabase.from("compliance_policies").update({ status }).eq("id", policyId);

  try {
    // --- Clean + chunk (skip if a prior run already chunked it) ----------
    let alreadyChunked = false;
    if (policy.status === "INDEXING") {
      const { count } = await supabase
        .from("policy_chunks")
        .select("id", { count: "exact", head: true })
        .eq("policy_id", policyId);
      alreadyChunked = (count ?? 0) > 0;
    }

    if (!alreadyChunked) {
      await setStatus("CLEANING");

      const { data: blob, error: dlError } = await supabase.storage
        .from(policy.storage_bucket)
        .download(policy.storage_path);
      if (dlError || !blob) {
        throw new Error(`Cannot download policy original ${policy.storage_path}: ${dlError?.message}`);
      }
      const key = deriveKey(config.DOCUMENT_ENCRYPTION_KEY);
      const originalBytes = decrypt(Buffer.from(await blob.arrayBuffer()), key);

      const rawText = await extractPolicyText(originalBytes, policy.mime_type, policyId, config);
      const cleaned = cleanDocumentText(rawText);
      if (!cleaned) {
        log.warn("policy had no text after cleaning — held", base);
        return { policyId, outcome: "held", reason: "empty after cleaning" };
      }

      const chunks = chunkText(cleaned);
      if (chunks.length === 0) {
        return { policyId, outcome: "held", reason: "no chunks produced" };
      }

      const { error: delError } = await supabase
        .from("policy_chunks")
        .delete()
        .eq("policy_id", policyId);
      if (delError) throw new Error(`Failed to clear existing policy chunks: ${delError.message}`);

      const { error: insError } = await supabase.from("policy_chunks").insert(
        chunks.map((content, chunk_index) => ({
          policy_id: policyId,
          chunk_index,
          content,
          embedding_status: "PENDING" as const,
        })),
      );
      if (insError) throw new Error(`Batch policy_chunks insert failed: ${insError.message}`);

      await setStatus("INDEXING");
      log.info("policy cleaned and chunked", { ...base, chunkCount: chunks.length, cleanedChars: cleaned.length });
    }

    // --- Embed the PENDING chunks + upsert to Pinecone ------------------
    const { data: chunkData, error: chunkErr } = await supabase
      .from("policy_chunks")
      .select("id, chunk_index, content")
      .eq("policy_id", policyId)
      .eq("embedding_status", "PENDING")
      .order("chunk_index", { ascending: true });
    if (chunkErr) throw new Error(`Cannot load pending policy chunks: ${chunkErr.message}`);

    const pendingChunks = (chunkData ?? []) as PolicyChunkRow[];
    let vectorsUpserted = 0;

    if (pendingChunks.length > 0) {
      const { embeddings, pinecone } = getEmbeddingClients(config);
      const vectors = await embeddings.embedTexts(pendingChunks.map((c) => c.content));
      if (vectors.length !== pendingChunks.length) {
        throw new EmbeddingError(
          `got ${vectors.length} vectors for ${pendingChunks.length} policy chunks`,
          undefined,
          false,
        );
      }

      const pineconeVectors: PineconeVector[] = pendingChunks.map((chunk, i) => {
        const values = vectors[i];
        if (!values) throw new EmbeddingError(`missing vector for policy chunk ${chunk.chunk_index}`);
        return {
          id: vectorId(policyId, chunk.chunk_index),
          values,
          metadata: {
            organization_id: policy.organization_id,
            policy_id: policyId,
            chunk_index: chunk.chunk_index,
          },
        };
      });

      const res = await pinecone.upsert(pineconeVectors, config.PINECONE_NAMESPACE_POLICY);
      vectorsUpserted = res.upsertedCount;

      const rows = pendingChunks.map((chunk, i) => ({
        id: chunk.id,
        policy_id: policyId,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        embedding_status: "EMBEDDED" as const,
        pinecone_vector_id: pineconeVectors[i]?.id ?? vectorId(policyId, chunk.chunk_index),
      }));
      const { error: upErr } = await supabase
        .from("policy_chunks")
        .upsert(rows, { onConflict: "id" });
      if (upErr) throw new Error(`policy_chunks status update failed: ${upErr.message}`);
    }

    // --- Complete when nothing is left PENDING -------------------------
    const { count: stillPending } = await supabase
      .from("policy_chunks")
      .select("id", { count: "exact", head: true })
      .eq("policy_id", policyId)
      .eq("embedding_status", "PENDING");

    const { count: totalChunks } = await supabase
      .from("policy_chunks")
      .select("id", { count: "exact", head: true })
      .eq("policy_id", policyId);

    if (!stillPending) {
      await setStatus("COMPLETED");
      log.info("policy processed and indexed", {
        ...base,
        chunkCount: totalChunks ?? 0,
        vectorsUpserted,
      });
      return { policyId, outcome: "completed", chunkCount: totalChunks ?? 0, vectorsUpserted };
    }

    log.warn("policy still has pending chunks after sweep — held", { ...base, stillPending });
    return { policyId, outcome: "held", reason: `${stillPending} chunks still pending` };
  } catch (err) {
    const retryable =
      (err instanceof EmbeddingError && err.retryable) ||
      (err instanceof PineconeError && err.retryable) ||
      !(err instanceof EmbeddingError || err instanceof PineconeError);
    const message = err instanceof Error ? err.message : String(err);
    log.error("policy processing failed — held for retry", { ...base, retryable, error: message });
    return { policyId, outcome: "held", reason: message };
  }
}
