import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";

/**
 * Phase 11 — Notification creation. Runs as its own sweep, fully decoupled
 * from Phase 9: it only reads `nlp_analyses` (via the latest-analysis view)
 * and INSERTs into `notifications`. A failure here can never touch an
 * analysis row or a document's status (HLSA §21, plan task 5) — the next
 * cycle simply retries.
 *
 * Fan-out (Architecture Decision, plan task 3): one notification per member
 * of the analysis's organization. `title`/`description` are captured from the
 * analysis at creation time and stored on the row — never a live join back to
 * `nlp_analyses` for display (DB Schema §4.1 / §20).
 */

/** Guard against a pathologically long one-liner becoming an unreadable feed title. */
const MAX_TITLE_CHARS = 500;

interface LatestAnalysisRow {
  organization_id: string;
  analysis_id: string;
  one_line_output: string;
  summary_output: string;
}

export interface NotificationCreationResult {
  documentId: string;
  outcome: "created" | "noop" | "held" | "skipped";
  notificationsCreated?: number;
  reason?: string;
}

export async function createNotificationsForDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  documentId: string,
): Promise<NotificationCreationResult> {
  const { data: doc, error: docErr } = await supabase
    .from("regulatory_documents")
    .select("id, status")
    .eq("id", documentId)
    .single();
  if (docErr || !doc) {
    return { documentId, outcome: "skipped", reason: "not found" };
  }
  if (doc.status !== "COMPLETED") {
    return { documentId, outcome: "skipped", reason: `status ${doc.status}` };
  }

  try {
    // One latest analysis per organization (DB Schema §34 view).
    const { data: analyses, error: aErr } = await supabase
      .from("regulatory_document_latest_analysis")
      .select("organization_id, analysis_id, one_line_output, summary_output")
      .eq("document_id", documentId);
    if (aErr) throw new Error(`latest-analysis query failed: ${aErr.message}`);
    if (!analyses || analyses.length === 0) {
      return { documentId, outcome: "skipped", reason: "no analysis yet" };
    }

    // Everyone who already has a notification for this document.
    const { data: existing, error: eErr } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("document_id", documentId);
    if (eErr) throw new Error(`existing-notifications query failed: ${eErr.message}`);
    const alreadyNotified = new Set((existing ?? []).map((r) => r.user_id as string));

    const rows: {
      user_id: string;
      document_id: string;
      nlp_analysis_id: string;
      title: string;
      description: string;
    }[] = [];

    for (const analysis of analyses as LatestAnalysisRow[]) {
      const { data: members, error: mErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", analysis.organization_id);
      if (mErr) throw new Error(`members query failed: ${mErr.message}`);

      for (const member of members ?? []) {
        const userId = member.id as string;
        if (alreadyNotified.has(userId)) continue;
        rows.push({
          user_id: userId,
          document_id: documentId,
          nlp_analysis_id: analysis.analysis_id,
          title: analysis.one_line_output.slice(0, MAX_TITLE_CHARS),
          description: analysis.summary_output,
        });
      }
    }

    if (rows.length === 0) {
      return { documentId, outcome: "noop", notificationsCreated: 0 };
    }

    // One multi-row INSERT (DB Schema §33), never one per recipient.
    const { error: insErr } = await supabase.from("notifications").insert(rows);
    if (insErr) throw new Error(`notifications insert failed: ${insErr.message}`);

    log.info("notifications created", {
      documentId,
      organizations: analyses.length,
      notificationsCreated: rows.length,
    });
    return { documentId, outcome: "created", notificationsCreated: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("notification creation failed — will retry next cycle", { documentId, error: message });
    return { documentId, outcome: "held", reason: message };
  }
}
