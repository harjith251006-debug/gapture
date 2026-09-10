/**
 * Provider-agnostic OCR types. Nothing here names OCR.space specifically —
 * that keeps `OCRService`'s callers decoupled from the concrete provider,
 * per docs/IMPLEMENTATION-PLAN.md §8.2.
 */

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  succeeded: boolean;
  errorMessage?: string;
}

export interface OcrResult {
  /** Full extracted text, all pages concatenated in order. */
  text: string;
  pages: OcrPageResult[];
  /** True only if every requested page was extracted without error. */
  succeeded: boolean;
  /** Populated when `succeeded` is false, or a page partially failed. */
  errorMessage?: string;
  /** Raw provider response, kept for debugging/logging — never persisted to Postgres (see DB Schema §15). */
  raw?: unknown;
}

export interface OcrRequestInput {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Thrown by a provider (or OCRService, after retries are exhausted) so
 * callers can distinguish a structured OCR failure from an unexpected
 * exception (network error, programming bug).
 */
export class OcrError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "OcrError";
  }
}
