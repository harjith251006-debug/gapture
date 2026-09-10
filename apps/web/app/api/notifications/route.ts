import {
  applyKeyset,
  decodeCursor,
  ok,
  pageResult,
  paginationQuerySchema,
  parseQuery,
  requireSession,
  route,
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotificationRow {
  id: string;
  document_id: string;
  nlp_analysis_id: string | null;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

/**
 * GET /api/notifications — the notification feed (DB Schema §44 Query 6): the
 * highest-frequency query in the product, zero-join (title/description are
 * denormalized onto the row), keyset-paginated. RLS scopes rows to
 * `user_id = auth.uid()`.
 */
export const GET = route("api/notifications", async (req) => {
  const { supabase } = await requireSession();
  const { cursor, limit } = parseQuery(paginationQuerySchema, req.url);
  const decoded = decodeCursor(cursor);

  const base = supabase
    .from("notifications")
    .select("id, document_id, nlp_analysis_id, title, description, is_read, created_at");

  const { data, error } = await applyKeyset(base, decoded, limit);
  if (error) throw new Error(`notifications query failed: ${error.message}`);

  const { page, nextCursor } = pageResult((data ?? []) as NotificationRow[], limit);

  return ok(
    page.map((n) => ({
      id: n.id,
      documentId: n.document_id,
      nlpAnalysisId: n.nlp_analysis_id,
      title: n.title,
      description: n.description,
      isRead: n.is_read,
      createdAt: n.created_at,
    })),
    { nextCursor },
  );
});
