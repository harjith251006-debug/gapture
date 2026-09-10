import { EmbeddingError, PineconeError, type PineconeVector } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";
import { getEmbeddingClients } from "./clients.js";

interface DocRow {
  id: string;
  status: string;
}
interface ChunkRow {
  id: string;
  chunk_index: number;
  content: string;
}

export interface EmbedResult {
  documentId: string;
  outcome: "indexed" | "held" | "skipped";
  chunkCount?: number;
  vectorsUpserted?: number;
  reason?: string;
}

/** Stable, deterministic vector id so a re-run upserts the same Pinecone row. */
function vectorId(documentId: string, chunkIndex: number): string {
  return `${documentId}:${chunkIndex}`;
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
 * Phase 7 pipeline for one document: embed its PENDING chunks in a single
 * batched call, upsert the vectors into Pinecone (namespace = regulatory,
 * metadata = document_id + chunk_index only), flip the chunks to EMBEDDED
 * with their vector ids in one statement, then advance INDEXING -> ANALYZING
 * once no chunk is left PENDING.
 *
 * Never throws. On an embedding/Pinecone failure the chunks are left PENDING
 * (they were never flipped), an error event is recorded, and the document is
 * held for a retry next cycle (HLSA §21 — no premature FAILED).
 */
export async function embedAndIndexDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  documentId: string,
): Promise<EmbedResult> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select("id, status")
    .eq("id", documentId)
    .single();

  if (error || !data) {
    log.error("cannot load document for embedding", { documentId, error: error?.message });
    return { documentId, outcome: "skipped", reason: "not found" };
  }

  const doc = data as DocRow;
  if (["ANALYZING", "COMPLETED"].includes(doc.status)) {
    return { documentId, outcome: "skipped", reason: `already at ${doc.status}` };
  }
  if (doc.status !== "INDEXING") {
    return { documentId, outcome: "skipped", reason: `not ready (status ${doc.status})` };
  }

  const { data: chunkData, error: chunkErr } = await supabase
    .from("document_chunks")
    .select("id, chunk_index, content")
    .eq("document_id", documentId)
    .eq("embedding_status", "PENDING")
    .order("chunk_index", { ascending: true });

  if (chunkErr) {
    log.error("cannot load pending chunks", { documentId, error: chunkErr.message });
    return { documentId, outcome: "held", reason: chunkErr.message };
  }

  const chunks = (chunkData ?? []) as ChunkRow[];

  // No PENDING chunks: either already embedded, or nothing was chunked.
  if (chunks.length === 0) {
    await supabase.rpc("advance_document_status", {
      p_document_id: documentId,
      p_new_status: "ANALYZING",
    });
    log.info("document had no pending chunks — advanced to ANALYZING", { documentId });
    return { documentId, outcome: "indexed", chunkCount: 0 };
  }

  try {
    const { embeddings, pinecone } = getEmbeddingClients(config);

    const vectors = await embeddings.embedTexts(chunks.map((c) => c.content));
    if (vectors.length !== chunks.length) {
      throw new EmbeddingError(
        `got ${vectors.length} vectors for ${chunks.length} chunks`,
        undefined,
        false,
      );
    }

    const pineconeVectors: PineconeVector[] = chunks.map((chunk, i) => {
      const values = vectors[i];
      if (!values) throw new EmbeddingError(`missing vector for chunk ${chunk.chunk_index}`);
      return {
        id: vectorId(documentId, chunk.chunk_index),
        values,
        metadata: { document_id: documentId, chunk_index: chunk.chunk_index },
      };
    });

    const { upsertedCount } = await pinecone.upsert(
      pineconeVectors,
      config.PINECONE_NAMESPACE_REGULATORY,
    );

    // One statement: flip every chunk to EMBEDDED with its vector id.
    const rows = chunks.map((chunk, i) => ({
      id: chunk.id,
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding_status: "EMBEDDED" as const,
      pinecone_vector_id: pineconeVectors[i]?.id ?? vectorId(documentId, chunk.chunk_index),
    }));
    const { error: upErr } = await supabase
      .from("document_chunks")
      .upsert(rows, { onConflict: "id" });
    if (upErr) throw new Error(`chunk status update failed: ${upErr.message}`);

    // Advance the document only when nothing is left PENDING.
    const { count: stillPending } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId)
      .eq("embedding_status", "PENDING");

    if (!stillPending) {
      const { error: rpcErr } = await supabase.rpc("advance_document_status", {
        p_document_id: documentId,
        p_new_status: "ANALYZING",
      });
      if (rpcErr) throw new Error(`failed to mark document ANALYZING: ${rpcErr.message}`);
    }

    log.info("document embedded and indexed", {
      documentId,
      chunkCount: chunks.length,
      vectorsUpserted: upsertedCount,
      model: embeddings.model,
      dimension: embeddings.dimension,
      advanced: !stillPending,
    });
    return {
      documentId,
      outcome: "indexed",
      chunkCount: chunks.length,
      vectorsUpserted: upsertedCount,
    };
  } catch (err) {
    const retryable =
      (err instanceof EmbeddingError && err.retryable) ||
      (err instanceof PineconeError && err.retryable) ||
      !(err instanceof EmbeddingError || err instanceof PineconeError);
    const message = err instanceof Error ? err.message : String(err);

    await recordErrorEvent(supabase, documentId, "INDEXING", message);
    log.error("document embedding failed — held for retry", { documentId, retryable, error: message });
    return { documentId, outcome: "held", reason: message };
  }
}
