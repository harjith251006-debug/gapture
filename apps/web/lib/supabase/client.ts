import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — uses the publishable/anon key only.
 * Never import this in server-only code that touches the service-role key.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check apps/web/.env.local",
    );
  }

  return createBrowserClient(url, anonKey);
}
