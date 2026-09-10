import { createHash } from "node:crypto";

/**
 * SHA-256 fingerprint of a file's bytes — used for duplicate detection,
 * document identity, and integrity (PRD FR-07, DB Schema §13/§16).
 *
 * This is HASHING, not encryption. It provides no confidentiality — that is
 * AES-256's job (see encryption.ts). Never treat a SHA-256 value as a secret.
 */
export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
