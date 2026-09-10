import { z } from "zod";
import { LlmError } from "@gapture/shared";
import { ApiError, ok, parseJsonBody, requireOrganizationId, requireSession, route } from "@/lib/api";
import { createAdmin } from "@/lib/supabase/admin";
import { createContextualQaService } from "@/lib/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().trim().min(3).max(2000),
});

/**
 * POST /api/qa — ask a grounded question about one regulatory document.
 * Retrieval + answer live in @gapture/shared's ContextualQaService; this
 * route validates the session, resolves the org server-side, and persists
 * the Q&A pair to `contextual_interactions` (one INSERT, after the answer
 * returns — DB Schema §21). The `organization_id` is set by the
 * `trg_interactions_set_org` trigger, never trusted from the request.
 */
export const POST = route("api/qa", async (req) => {
  const session = await requireSession();
  const organizationId = await requireOrganizationId(session);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new ApiError("bad_request", "Request body must be JSON");
  }
  const { documentId, question } = parseJsonBody(bodySchema, rawBody);

  // Regulatory documents are global reference data — existence check only.
  const { data: doc, error: docErr } = await session.supabase
    .from("regulatory_documents")
    .select("id, title")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr) throw new Error(`document lookup failed: ${docErr.message}`);
  if (!doc) throw new ApiError("not_found", "Document not found");

  let result;
  try {
    result = await createContextualQaService().answer({
      documentId,
      organizationId,
      documentTitle: doc.title,
      question,
    });
  } catch (err) {
    if (err instanceof LlmError) {
      throw new ApiError("upstream_error", "The answer service is temporarily unavailable. Please try again.");
    }
    throw err;
  }

  const { data: saved, error: insErr } = await createAdmin()
    .from("contextual_interactions")
    .insert({ user_id: session.userId, document_id: documentId, question_text: question, answer_text: result.answer })
    .select("id, created_at")
    .single();
  if (insErr) throw new Error(`contextual_interactions insert failed: ${insErr.message}`);

  return ok(
    {
      id: saved.id,
      documentId,
      question,
      answer: result.answer,
      answered: result.answered,
      createdAt: saved.created_at,
    },
    undefined,
    { status: 201 },
  );
});
