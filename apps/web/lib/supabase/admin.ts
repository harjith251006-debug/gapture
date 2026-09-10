import { createAdminClient } from "@gapture/shared";

/**
 * Service-role Supabase client for server-only privileged writes (e.g.
 * inserting into `contextual_interactions`, which has no client INSERT RLS
 * policy — DB Schema §35). NEVER import this into a Client Component.
 */
export function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check apps/web/.env.local",
    );
  }
  return createAdminClient(url, serviceRoleKey);
}
