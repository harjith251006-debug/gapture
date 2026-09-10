import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates a time-limited signed URL for a Storage object. Never returns a
 * permanently public link (DB Schema §36, Phase 3) — every retrieval of an
 * original document/policy goes through this.
 */
export async function getSignedUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create signed URL for ${bucket}/${path}: ${error?.message}`);
  }

  return data.signedUrl;
}
