import { z } from "zod";
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

const DOCUMENT_STATUSES = [
  "DETECTED",
  "RETRIEVED",
  "OCR_PROCESSING",
  "SECURED",
  "STORED",
  "CLEANING",
  "INDEXING",
  "ANALYZING",
  "COMPLETED",
  "FAILED",
] as const;

const filterSchema = paginationQuerySchema.extend({
  source: z.string().trim().min(1).max(20).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
});

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
  const { cursor, limit, source, status } = parseQuery(filterSchema, req.url);
  const decoded = decodeCursor(cursor);

  let base = supabase
    .from("regulatory_documents")
    .select("id, title, status, published_at, created_at, regulatory_sources!inner(code, name)");

  if (status) base = base.eq("status", status);
  if (source) base = base.eq("regulatory_sources.code", source.toUpperCase());

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
