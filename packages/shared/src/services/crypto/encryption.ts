import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for stored original regulatory documents
 * (PRD FR-07 "Encryption", HLSA AD-13, Tech Stack §12).
 *
 * MVP key management (HLSA §33 "Future/Production Enhancements" — a KMS is
 * explicitly deferred): a single server-side symmetric key supplied as the
 * `DOCUMENT_ENCRYPTION_KEY` environment secret. `deriveKey` turns an
 * arbitrary-length passphrase into the required 32 bytes via SHA-256, so the
 * env value doesn't have to be exactly 32 bytes.
 *
 * Wire format of the returned buffer:  iv(12) ‖ authTag(16) ‖ ciphertext
 */

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = "aes-256-gcm";

export function deriveKey(passphrase: string): Buffer {
  if (!passphrase) {
    throw new Error("deriveKey requires a non-empty passphrase (DOCUMENT_ENCRYPTION_KEY)");
  }
  return createHash("sha256").update(passphrase, "utf8").digest();
}

export function encrypt(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decrypt(payload: Buffer, key: Buffer): Buffer {
  if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted payload is too short to contain an IV and auth tag");
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
