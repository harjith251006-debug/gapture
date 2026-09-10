import { z } from "zod";
import { ok, parseQuery, requireSession, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  documentId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

interface InteractionRow {
  id: string;
  question_text: string;
  answer_text: string;
  created_at: string;
}

/**
 * GET /api/qa/history?documentId=... — this user's Q&A history for one
 * document (DB Schema §44 Query 9, `idx_interactions_user_doc_time`). RLS
 * (`contextual_interactions_own`) scopes rows to `user_id = auth.uid()`.
 */
export const GET = route("api/qa/history", async (req) => {
  const { supabase } = await requireSession();
  const { documentId, limit } = parseQuery(querySchema, req.url);

  const { data, error } = await supabase
    .from("contextual_interactions")
    .select("id, question_text, answer_text, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`qa history query failed: ${error.message}`);

  return ok(
    ((data ?? []) as InteractionRow[]).map((r) => ({
      id: r.id,
      question: r.question_text,
      answer: r.answer_text,
      createdAt: r.created_at,
    })),
  );
});
