import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client — uses the service-role key, bypasses RLS.
 * Framework-agnostic (no cookie/session handling), so it's usable from both
 * the Node.js worker and any privileged server-side Next.js code. NEVER
 * import this from a Client Component or anything that reaches the browser.
 */
export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient requires both a Supabase URL and a service-role key — never fall back to a default or empty value",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
