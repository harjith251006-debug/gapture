import { z } from "zod";
import { ApiError, ok, parseJsonBody, requireSession, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ isRead: z.boolean().optional().default(true) });

/**
 * PATCH /api/notifications/[id]/read — mark one notification read (or unread).
 * Mutates `is_read` / `read_at` only, scoped to the caller (RLS:
 * `notifications_own_update`, `user_id = auth.uid()`). The DB CHECK
 * (`read_at IS NULL OR is_read = true`) is respected: unread clears read_at.
 */
export const PATCH = route("api/notifications/[id]/read", async (req, ctx) => {
  const { supabase, userId } = await requireSession();

  const parsedParams = paramsSchema.safeParse(await ctx.params);
  if (!parsedParams.success) throw new ApiError("bad_request", "Invalid notification id");

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text) rawBody = JSON.parse(text);
  } catch {
    throw new ApiError("bad_request", "Request body must be JSON");
  }
  const { isRead } = parseJsonBody(bodySchema, rawBody);

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq("id", parsedParams.data.id)
    .eq("user_id", userId)
    .select("id, is_read, read_at")
    .maybeSingle();

  if (error) throw new Error(`notification update failed: ${error.message}`);
  if (!data) throw new ApiError("not_found", "Notification not found");

  return ok({ id: data.id, isRead: data.is_read, readAt: data.read_at });
});
