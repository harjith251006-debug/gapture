import { z } from "zod";
import { ApiError, ok, requireOrganizationId, requireSession, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().uuid() });

interface DetailRow {
  document_id: string;
  title: string;
  status: string;
  source_code: string | null;
  source_name: string | null;
  one_line_output: string | null;
  detailed_output: string | null;
  summary_output: string | null;
  analyzed_at: string | null;
}

/**
 * GET /api/documents/[id] — document detail plus the latest NLP analysis for
 * the caller's organization, in one round trip via the
 * `get_document_with_latest_analysis` RPC (DB Schema §44 Query 2 / §34).
 */
export const GET = route("api/documents/[id]", async (_req, ctx) => {
  const session = await requireSession();
  const organizationId = await requireOrganizationId(session);

  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) throw new ApiError("bad_request", "Invalid document id");

  const { data, error } = await session.supabase.rpc("get_document_with_latest_analysis", {
    p_document_id: parsed.data.id,
    p_organization_id: organizationId,
  });
  if (error) throw new Error(`document detail query failed: ${error.message}`);

  const rows = (data ?? []) as DetailRow[];
  const row = rows[0];
  if (!row) throw new ApiError("not_found", "Document not found");

  return ok({
    id: row.document_id,
    title: row.title,
    status: row.status,
    source:
      row.source_code || row.source_name
        ? { code: row.source_code, name: row.source_name }
        : null,
    analysis: row.one_line_output
      ? {
          oneLine: row.one_line_output,
          detailed: row.detailed_output,
          summary: row.summary_output,
          analyzedAt: row.analyzed_at,
        }
      : null,
  });
});
