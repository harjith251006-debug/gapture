import { deriveKey, encrypt, sha256Hex, REGULATORY_DOCUMENTS_BUCKET } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";

export interface SecureStoreInput {
  documentId: string;
  externalReference: string;
  sourceCode: string;
  publishedYear: number;
  /** The original file bytes (PDF, or the page HTML when there is no PDF). */
  originalBytes: Buffer;
  originalMimeType: string;
  /** Direct URL the original was fetched from, recorded on the row. */
  fileUrl: string | null;
  /** Machine-readable text (from HTML parse or OCR) for Phase 6 to clean. */
  extractedText: string;
}

export interface SecureStoreResult {
  sha256: string;
  storagePath: string;
  /** Sibling path holding the encrypted extracted text — Phase 6 reads this. */
  extractedTextPath: string;
  duplicateOfExisting: boolean;
}

function docDir(input: SecureStoreInput): string {
  return `${input.sourceCode.toLowerCase()}/${input.publishedYear}/${input.externalReference}`;
}

/**
 * Secure + store (PRD FR-07/FR-08). Order matters:
 *   1. SHA-256 the original bytes; check for a same-source duplicate.
 *   2. AES-256-GCM encrypt the original and the extracted text.
 *   3. Upload both to Supabase Storage (outside any DB transaction).
 *   4. Atomically (RPC) set sha256, storage bucket/path, mime, size, and the
 *      SECURED then STORED status transitions, each with a processing event.
 *
 * Plaintext is never written to Storage or the database.
 */
export async function secureAndStore(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  input: SecureStoreInput,
): Promise<SecureStoreResult> {
  const key = deriveKey(config.DOCUMENT_ENCRYPTION_KEY);
  const sha256 = sha256Hex(input.originalBytes);

  const sourceId = (
    await supabase.from("regulatory_documents").select("source_id").eq("id", input.documentId).single()
  ).data?.source_id as string | undefined;

  let duplicateOfExisting = false;
  if (sourceId) {
    const { data: dupes } = await supabase
      .from("regulatory_documents")
      .select("id")
      .eq("source_id", sourceId)
      .eq("sha256", sha256)
      .neq("id", input.documentId)
      .limit(1);
    duplicateOfExisting = (dupes?.length ?? 0) > 0;
    if (duplicateOfExisting) {
      log.warn("original file content matches an already-stored document", {
        documentId: input.documentId,
        sha256,
      });
    }
  }

  const dir = docDir(input);
  const storagePath = `${dir}/original.enc`;
  const extractedTextPath = `${dir}/extracted.enc`;

  await supabase.rpc("advance_document_status", {
    p_document_id: input.documentId,
    p_new_status: "SECURED",
    p_sha256: sha256,
  });

  const bucket = supabase.storage.from(REGULATORY_DOCUMENTS_BUCKET);

  const up1 = await bucket.upload(storagePath, encrypt(input.originalBytes, key), {
    contentType: "application/octet-stream",
    upsert: true,
  });
  if (up1.error) throw new Error(`Storage upload failed (original): ${up1.error.message}`);

  const up2 = await bucket.upload(
    extractedTextPath,
    encrypt(Buffer.from(input.extractedText, "utf8"), key),
    { contentType: "application/octet-stream", upsert: true },
  );
  if (up2.error) throw new Error(`Storage upload failed (extracted text): ${up2.error.message}`);

  const { error: rpcError } = await supabase.rpc("advance_document_status", {
    p_document_id: input.documentId,
    p_new_status: "STORED",
    p_storage_bucket: REGULATORY_DOCUMENTS_BUCKET,
    p_storage_path: storagePath,
    p_mime_type: input.originalMimeType,
    p_file_size_bytes: input.originalBytes.byteLength,
    p_file_url: input.fileUrl,
  });
  if (rpcError) throw new Error(`Failed to mark document STORED: ${rpcError.message}`);

  return { sha256, storagePath, extractedTextPath, duplicateOfExisting };
}
