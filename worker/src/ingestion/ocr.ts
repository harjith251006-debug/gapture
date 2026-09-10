import { OCRService, OcrSpaceProvider, type OcrResult } from "@gapture/shared";
import type { Config } from "../config.js";

let cached: OCRService | undefined;

export function getOcrService(config: Config): OCRService {
  if (!cached) {
    cached = new OCRService(
      new OcrSpaceProvider({
        apiKey: config.OCR_SPACE_API_KEY,
        timeoutMs: config.OCR_REQUEST_TIMEOUT_MS,
      }),
    );
  }
  return cached;
}

export type { OcrResult };
