import { ok, requireSession, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/unread-count — backed by the partial index
 * `idx_notifications_unread` (DB Schema §44 Query 4). RLS scopes to the
 * caller; `head: true` means no rows are transferred, just the count.
 */
export const GET = route("api/notifications/unread-count", async () => {
  const { supabase } = await requireSession();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw new Error(`unread-count query failed: ${error.message}`);

  return ok({ unread: count ?? 0 });
});
