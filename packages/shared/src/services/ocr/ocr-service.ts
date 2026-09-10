import type { OcrProvider } from "./ocr-provider.interface";
import { OcrError, type OcrRequestInput, type OcrResult } from "./types";

export interface OcrServiceOptions {
  maxRetries?: number;
  /** Base delay for exponential backoff between retries. */
  baseDelayMs?: number;
}

/**
 * The one thing every other component in the pipeline depends on for OCR —
 * never a concrete provider directly (docs/IMPLEMENTATION-PLAN.md §8.2).
 * Wraps whatever `OcrProvider` it's given with retry/backoff and structured
 * logging, so provider-specific code never has to reimplement this.
 */
export class OCRService {
  private readonly provider: OcrProvider;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(provider: OcrProvider, options: OcrServiceOptions = {}) {
    this.provider = provider;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
  }

  async extractText(input: OcrRequestInput): Promise<OcrResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.provider.extractText(input);
        if (attempt > 0) {
          console.log(
            JSON.stringify({
              level: "info",
              component: "OCRService",
              message: "OCR succeeded after retry",
              filename: input.filename,
              attempt,
            }),
          );
        }
        return result;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof OcrError ? err.retryable : true;

        console.error(
          JSON.stringify({
            level: "error",
            component: "OCRService",
            message: "OCR attempt failed",
            filename: input.filename,
            attempt,
            retryable,
            error: err instanceof Error ? err.message : String(err),
          }),
        );

        if (!retryable || attempt === this.maxRetries) {
          break;
        }

        const delay = this.baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError instanceof OcrError
      ? lastError
      : new OcrError("OCR failed after all retries", lastError, false);
  }
}
