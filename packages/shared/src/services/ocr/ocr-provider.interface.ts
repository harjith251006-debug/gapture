import type { OcrRequestInput, OcrResult } from "./types";

/**
 * The abstraction every OCR vendor implements. `OCRService` (ocr-service.ts)
 * depends on this interface only — never on a concrete provider — so the
 * vendor can be swapped without touching the rest of the document-processing
 * pipeline (docs/IMPLEMENTATION-PLAN.md §8.2).
 *
 * Only one implementation exists today: `OcrSpaceProvider`. No fallback
 * provider is introduced (per explicit instruction — OCR.space is the ONLY
 * OCR provider for this project).
 */
export interface OcrProvider {
  extractText(input: OcrRequestInput): Promise<OcrResult>;
}
