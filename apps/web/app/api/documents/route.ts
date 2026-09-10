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

interface DocumentRow {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  created_at: string;
  regulatory_sources: { code: string; name: string } | { code: string; name: string }[] | null;
}

/**
 * GET /api/documents — keyset-paginated list of regulatory documents with
 * their source (DB Schema §44 Query 1 + Query 10). Regulatory documents are
 * global reference data (RLS: any authenticated user), so this is not
 * org-scoped — only session-required.
 */
export const GET = route("api/documents", async (req) => {
  const { supabase } = await requireSession();
  const { cursor, limit } = parseQuery(paginationQuerySchema, req.url);
  const decoded = decodeCursor(cursor);

  const base = supabase
    .from("regulatory_documents")
    .select("id, title, status, published_at, created_at, regulatory_sources!inner(code, name)");

  const { data, error } = await applyKeyset(base, decoded, limit);
  if (error) throw new Error(`documents query failed: ${error.message}`);

  const { page, nextCursor } = pageResult((data ?? []) as DocumentRow[], limit);

  return ok(
    page.map((d) => {
      const src = Array.isArray(d.regulatory_sources) ? d.regulatory_sources[0] : d.regulatory_sources;
      return {
        id: d.id,
        title: d.title,
        status: d.status,
        publishedAt: d.published_at,
        source: src ? { code: src.code, name: src.name } : null,
      };
    }),
    { nextCursor },
  );
});
