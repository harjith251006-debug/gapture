import type { OcrProvider } from "../ocr-provider.interface";
import { OcrError, type OcrRequestInput, type OcrResult } from "../types";

/**
 * OCR.space integration — the ONLY OCR provider for Gapture FT-07
 * (docs/IMPLEMENTATION-PLAN.md §8.3). Verified against OCR.space's own
 * published API reference (https://ocr.space/ocrapi) — nothing here is
 * guessed.
 *
 * Free-tier limits that shape this implementation: 1 MB max file size,
 * PDFs capped at 3 pages. This provider does NOT attempt to split an
 * oversized PDF — it surfaces a clear, typed `OcrError` instead, so the
 * caller (Document Ingestion, Phase 5) can decide how to handle it rather
 * than silently losing pages.
 */

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const FREE_TIER_MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

interface OcrSpaceParsedResult {
  ParsedText?: string;
  FileParseExitCode?: number;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
  ProcessingTimeInMilliseconds?: string;
}

export interface OcrSpaceProviderOptions {
  apiKey: string;
  /** Milliseconds before a single OCR.space call is aborted. */
  timeoutMs?: number;
  /** OCR.space engine: 2 (default, handles noise/rotation well) or 3 (higher accuracy, slower). */
  engine?: 2 | 3;
}

function flattenErrorMessage(msg: string | string[] | undefined): string | undefined {
  if (!msg) return undefined;
  return Array.isArray(msg) ? msg.join("; ") : msg;
}

export class OcrSpaceProvider implements OcrProvider {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly engine: 2 | 3;

  constructor(options: OcrSpaceProviderOptions) {
    if (!options.apiKey) {
      throw new Error("OcrSpaceProvider requires an API key (OCR_SPACE_API_KEY)");
    }
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.engine = options.engine ?? 2;
  }

  async extractText(input: OcrRequestInput): Promise<OcrResult> {
    if (input.fileBuffer.byteLength > FREE_TIER_MAX_FILE_SIZE_BYTES) {
      // Deliberately not retryable — a bigger file will never succeed against
      // the free tier. Phase 5's file-validation step should catch this
      // before calling OCRService at all; this is the defense-in-depth check.
      throw new OcrError(
        `File is ${input.fileBuffer.byteLength} bytes, exceeding OCR.space's free-tier limit of ${FREE_TIER_MAX_FILE_SIZE_BYTES} bytes (1 MB). Split the document or upgrade to OCR.space's PRO tier — do not silently truncate.`,
        undefined,
        false,
      );
    }

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType }),
      input.filename,
    );
    formData.append("OCREngine", String(this.engine));
    formData.append("isTable", "true"); // regulatory circulars often contain tabular content
    formData.append("scale", "true"); // upscale low-resolution scans

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(OCR_SPACE_ENDPOINT, {
        method: "POST",
        headers: { apikey: this.apiKey },
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      throw new OcrError(
        isAbort ? `OCR.space request timed out after ${this.timeoutMs}ms` : "OCR.space request failed",
        err,
        true, // network errors and timeouts are retryable
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new OcrError(
        `OCR.space returned HTTP ${response.status}`,
        await response.text().catch(() => undefined),
        response.status >= 500, // 5xx retryable, 4xx (bad key, bad request) is not
      );
    }

    const body = (await response.json()) as OcrSpaceResponse;

    // OCR.space signals failure via IsErroredOnProcessing/OCRExitCode, not
    // necessarily via HTTP status — a 200 response can still be a failure.
    if (body.IsErroredOnProcessing || (body.OCRExitCode !== undefined && body.OCRExitCode > 1)) {
      const message = flattenErrorMessage(body.ErrorMessage) ?? "OCR.space reported a processing error";
      // Exit code 4 = fatal error (retryable); 2/3 = partial/all-failed (not retryable — the input itself was the problem)
      throw new OcrError(message, body.ErrorDetails, body.OCRExitCode === 4);
    }

    const parsedResults = body.ParsedResults ?? [];
    const pages = parsedResults.map((result, index) => ({
      pageNumber: index + 1,
      text: result.ParsedText ?? "",
      succeeded: result.FileParseExitCode === 1,
      errorMessage: flattenErrorMessage(result.ErrorMessage),
    }));

    const allSucceeded = pages.length > 0 && pages.every((p) => p.succeeded);

    return {
      text: pages.map((p) => p.text).join("\n\n"),
      pages,
      succeeded: allSucceeded,
      errorMessage: allSucceeded ? undefined : "One or more pages failed to parse",
      raw: body,
    };
  }
}
