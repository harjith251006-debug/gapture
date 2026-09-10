import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";
import { OcrError } from "@gapture/shared";
import { fetchBinary, fetchText, RetrievalError } from "./fetch.js";
import { extractPageText, findPrimaryPdfUrl, MIN_USABLE_PAGE_TEXT } from "./extract.js";
import { getOcrService } from "./ocr.js";
import { secureAndStore } from "./secure-store.js";

interface DocumentRow {
  id: string;
  external_reference: string;
  title: string;
  source_url: string;
  file_url: string | null;
  status: string;
  published_at: string | null;
  regulatory_sources: { code: string } | null;
}

const OCR_SPACE_MAX_BYTES = 1024 * 1024; // free tier

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

export interface ProcessResult {
  documentId: string;
  outcome: "stored" | "held" | "skipped";
  method?: "page-text" | "ocr" | "title-only";
  textChars?: number;
  reason?: string;
}

/**
 * Phase 5 pipeline for one document: retrieve → extract text → secure → store.
 * Never throws — on failure it records an error event, leaves the document at
 * its last good status for a later retry (HLSA §21/§24), and returns.
 * Ends at status STORED; Phase 6 (cleaning) picks up from the encrypted
 * `extracted.enc` sidecar.
 */
export async function processDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  documentId: string,
): Promise<ProcessResult> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select(
      "id, external_reference, title, source_url, file_url, status, published_at, regulatory_sources(code)",
    )
    .eq("id", documentId)
    .single();

  if (error || !data) {
    log.error("cannot load document for processing", { documentId, error: error?.message });
    return { documentId, outcome: "skipped", reason: "not found" };
  }

  const doc = data as unknown as DocumentRow;
  const sourceCode = doc.regulatory_sources?.code ?? "UNKNOWN";
  const year = (doc.published_at ? new Date(doc.published_at) : new Date()).getUTCFullYear();
  const base = { documentId, source: sourceCode, externalReference: doc.external_reference };

  if (["STORED", "CLEANING", "INDEXING", "ANALYZING", "COMPLETED"].includes(doc.status)) {
    return { documentId, outcome: "skipped", reason: `already at ${doc.status}` };
  }

  try {
    // --- Retrieve the landing page -----------------------------------------
    const pageHtml = await fetchText(doc.source_url, config.SOURCE_FETCH_TIMEOUT_MS);
    await supabase.rpc("advance_document_status", {
      p_document_id: documentId,
      p_new_status: "RETRIEVED",
      p_retrieved_at: new Date().toISOString(),
    });

    const discoveredPdfUrl =
      doc.file_url ?? findPrimaryPdfUrl(pageHtml, doc.source_url, sourceCode);
    const pageText = extractPageText(pageHtml, sourceCode);
    const usablePageText = pageText.length >= 50 ? pageText : "";

    let originalBytes: Buffer;
    let originalMimeType: string;
    let fileUrl: string | null = discoveredPdfUrl ?? doc.source_url;
    let extractedText: string;
    let method: ProcessResult["method"];

    if (usablePageText.length >= MIN_USABLE_PAGE_TEXT) {
      // Page carries the full text (RBI always; some SEBI). The canonical
      // page IS the original — no OCR, no redundant PDF download.
      extractedText = usablePageText;
      method = "page-text";
      originalBytes = Buffer.from(pageHtml, "utf8");
      originalMimeType = "text/html";
    } else if (discoveredPdfUrl) {
      const pdf = await fetchBinary(
        discoveredPdfUrl,
        config.SOURCE_FETCH_TIMEOUT_MS,
        config.MAX_DOCUMENT_BYTES,
      );
      const isRealPdf = pdf.bytes.subarray(0, 5).toString("latin1") === "%PDF-";

      if (!isRealPdf) {
        await recordErrorEvent(
          supabase,
          documentId,
          "RETRIEVED",
          `Link ${discoveredPdfUrl} did not return a PDF (content-type ${pdf.contentType})`,
        );
        extractedText = usablePageText || doc.title;
        method = "title-only";
        originalBytes = Buffer.from(pageHtml, "utf8");
        originalMimeType = "text/html";
        fileUrl = doc.source_url;
      } else if (pdf.bytes.byteLength > OCR_SPACE_MAX_BYTES) {
        await recordErrorEvent(
          supabase,
          documentId,
          "OCR_PROCESSING",
          `PDF is ${pdf.bytes.byteLength} bytes, over OCR.space's 1 MB free-tier limit — stored; extracted text is page/title only. Needs PDF splitting or a paid OCR tier.`,
        );
        extractedText = usablePageText || doc.title;
        method = "title-only";
        originalBytes = pdf.bytes;
        originalMimeType = "application/pdf";
        fileUrl = pdf.finalUrl;
        log.warn("PDF over OCR.space limit — page/title text only", {
          ...base,
          pdfBytes: pdf.bytes.byteLength,
        });
      } else {
        await supabase.rpc("advance_document_status", {
          p_document_id: documentId,
          p_new_status: "OCR_PROCESSING",
        });
        const result = await getOcrService(config).extractText({
          fileBuffer: pdf.bytes,
          mimeType: "application/pdf",
          filename: `${doc.external_reference}.pdf`,
        });
        const ocrText = result.text.trim();
        extractedText = ocrText || usablePageText || doc.title;
        method = ocrText ? "ocr" : "title-only";
        originalBytes = pdf.bytes;
        originalMimeType = "application/pdf";
        fileUrl = pdf.finalUrl;
        if (!result.succeeded) {
          await recordErrorEvent(
            supabase,
            documentId,
            "OCR_PROCESSING",
            `OCR partial/failed: ${result.errorMessage ?? "unknown"} (${result.pages.length} page(s))`,
          );
        }
      }
    } else {
      // No PDF, thin page — the title is effectively the whole notice
      // (SEBI recovery/remittance notices).
      extractedText = usablePageText ? `${doc.title}\n\n${usablePageText}` : doc.title;
      method = "title-only";
      originalBytes = Buffer.from(pageHtml, "utf8");
      originalMimeType = "text/html";
      fileUrl = doc.source_url;
    }

    // --- Secure + store ---------------------------------------------------
    const stored = await secureAndStore(supabase, log, config, {
      documentId,
      externalReference: doc.external_reference,
      sourceCode,
      publishedYear: year,
      originalBytes,
      originalMimeType,
      fileUrl,
      extractedText,
    });

    log.info("document stored", {
      ...base,
      method,
      textChars: extractedText.length,
      sha256: stored.sha256,
      storagePath: stored.storagePath,
      duplicate: stored.duplicateOfExisting,
    });

    // Phase 6 handoff: cleaning/chunking reads stored.extractedTextPath.
    return { documentId, outcome: "stored", method, textChars: extractedText.length };
  } catch (err) {
    const retryable =
      (err instanceof RetrievalError && err.retryable) ||
      (err instanceof OcrError && err.retryable) ||
      !(err instanceof RetrievalError || err instanceof OcrError);
    const message = err instanceof Error ? err.message : String(err);

    // Leave the document at its last good status for a retry next cycle.
    const { data: current } = await supabase
      .from("regulatory_documents")
      .select("status")
      .eq("id", documentId)
      .single();
    await recordErrorEvent(supabase, documentId, current?.status ?? "DETECTED", message);

    log.error("document processing failed — held for retry", { ...base, retryable, error: message });
    return { documentId, outcome: "held", reason: message };
  }
}
