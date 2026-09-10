import { LlmError } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Logger } from "../logger.js";
import type { Config } from "../config.js";
import { getAnalysisService } from "../intelligence/clients.js";
import {
  getOrganizationsWithPolicies,
  getRegulatoryText,
  retrievePolicyContext,
} from "./retrieve-context.js";

/**
 * Phase 9 — NLP / AI Engine. For one ANALYZING regulatory document, run a
 * grounded regulatory-vs-policy comparison PER organization that has indexed
 * policies (DB Schema §7), persist each result as a new immutable
 * `nlp_analyses` row, and advance the document to COMPLETED once every
 * target org has a row.
 *
 * Atomicity (DB Schema §31, plan task 6): supabase-js has no multi-statement
 * transaction, so instead of one — the invariant "never COMPLETED without an
 * analysis" is held structurally: all `nlp_analyses` inserts happen first,
 * the status only advances after every one succeeds, and a re-run skips orgs
 * that already have a row (so a crash mid-loop self-heals without duplicates
 * or a prematurely-COMPLETED document).
 *
 * Never throws. A per-org failure holds the whole document at ANALYZING for
 * a retry next cycle; already-analysed orgs are not redone.
 */

interface DocRow {
  id: string;
  title: string;
  status: string;
}

export interface AnalysisRunResult {
  documentId: string;
  outcome: "analyzed" | "held" | "skipped";
  analysesCreated?: number;
  organizations?: number;
  reason?: string;
}

export async function runAnalysisForDocument(
  supabase: WorkerSupabaseClient,
  log: Logger,
  config: Config,
  documentId: string,
): Promise<AnalysisRunResult> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select("id, title, status")
    .eq("id", documentId)
    .single();
  if (error || !data) {
    log.error("cannot load document for analysis", { documentId, error: error?.message });
    return { documentId, outcome: "skipped", reason: "not found" };
  }

  const doc = data as DocRow;
  if (doc.status === "COMPLETED") {
    return { documentId, outcome: "skipped", reason: "already COMPLETED" };
  }
  if (doc.status !== "ANALYZING") {
    return { documentId, outcome: "skipped", reason: `not ready (status ${doc.status})` };
  }

  try {
    const orgIds = await getOrganizationsWithPolicies(supabase);
    if (orgIds.length === 0) {
      log.warn("no organizations have indexed policies — document held at ANALYZING", { documentId });
      return { documentId, outcome: "held", reason: "no organizations with policies" };
    }

    const reg = await getRegulatoryText(supabase, documentId, config.ANALYSIS_MAX_REG_CHARS);
    const queryText = `${reg.title}\n\n${reg.text}`;

    const { data: existing } = await supabase
      .from("nlp_analyses")
      .select("organization_id")
      .eq("document_id", documentId);
    const alreadyAnalysed = new Set((existing ?? []).map((r) => r.organization_id as string));

    const analysisService = getAnalysisService(config);
    let created = 0;
    let failed = 0;

    for (const organizationId of orgIds) {
      if (alreadyAnalysed.has(organizationId)) continue;

      try {
        const policyContext = await retrievePolicyContext(supabase, config, organizationId, queryText);

        const result = await analysisService.analyze({
          documentTitle: reg.title,
          sourceName: reg.sourceName,
          regulatoryText: reg.text,
          policyContext,
        });

        const { error: insErr } = await supabase.from("nlp_analyses").insert({
          document_id: documentId,
          organization_id: organizationId,
          one_line_output: result.oneLine,
          detailed_output: result.detailed,
          summary_output: result.summary,
        });
        if (insErr) throw new Error(`nlp_analyses insert failed: ${insErr.message}`);

        created++;
        log.info("analysis persisted", {
          documentId,
          organizationId,
          model: result.model,
          evidenceSufficient: result.evidenceSufficient,
          policyChunks: policyContext.length,
        });
      } catch (orgErr) {
        failed++;
        const message = orgErr instanceof Error ? orgErr.message : String(orgErr);
        log.error("analysis failed for one organization — will retry", { documentId, organizationId, error: message });
      }
    }

    if (failed > 0) {
      return { documentId, outcome: "held", analysesCreated: created, organizations: orgIds.length, reason: `${failed} organization(s) failed` };
    }

    // Every target org has a row now — safe to complete.
    const { error: statusErr } = await supabase.rpc("advance_document_status", {
      p_document_id: documentId,
      p_new_status: "COMPLETED",
    });
    if (statusErr) {
      // Analyses are all persisted; only the status flip failed. Held — a
      // retry will find every org already analysed and just re-attempt this.
      log.error("analyses done but COMPLETED transition failed — held", { documentId, error: statusErr.message });
      return { documentId, outcome: "held", analysesCreated: created, reason: statusErr.message };
    }

    log.info("document analysis complete", { documentId, analysesCreated: created, organizations: orgIds.length });
    return { documentId, outcome: "analyzed", analysesCreated: created, organizations: orgIds.length };
  } catch (err) {
    const retryable = !(err instanceof LlmError) || err.retryable;
    const message = err instanceof Error ? err.message : String(err);
    log.error("document analysis failed — held for retry", { documentId, retryable, error: message });
    return { documentId, outcome: "held", reason: message };
  }
}
