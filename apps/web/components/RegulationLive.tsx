"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryView, type AnalysisData } from "@/components/SummaryView";
import { DetailedBrief } from "@/components/DetailedBrief";
import { QuestionInterface } from "@/components/QuestionInterface";
import { ProcessingSteps } from "@/components/ProcessingSteps";

const POLL_INTERVAL_MS = 6000;
/** Q&A grounds itself directly in this document's own embedded chunks — ready once past INDEXING. */
const QA_READY_STATUSES = new Set(["ANALYZING", "COMPLETED"]);

interface LiveState {
  status: string;
  analysis: AnalysisData | null;
  hasPolicies: boolean;
}

/** True once nothing further will change on its own without user action. */
function isSettled(state: LiveState): boolean {
  if (state.status === "FAILED" || state.status === "COMPLETED") return true;
  if (QA_READY_STATUSES.has(state.status)) {
    // Q&A-ready, but the per-org comparison card may still be pending (or,
    // if this org has no policies, will never arrive on its own).
    return state.analysis !== null || !state.hasPolicies;
  }
  return false;
}

export function RegulationLive({
  documentId,
  initialStatus,
  initialAnalysis,
  initialHasPolicies,
}: {
  documentId: string;
  initialStatus: string;
  initialAnalysis: AnalysisData | null;
  initialHasPolicies: boolean;
}) {
  const [state, setState] = useState<LiveState>({
    status: initialStatus,
    analysis: initialAnalysis,
    hasPolicies: initialHasPolicies,
  });
  const settledRef = useRef(isSettled(state));

  useEffect(() => {
    if (settledRef.current) return; // already settled at first paint — no need to poll at all
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const json = await res.json();
          if (!active) return;
          const next: LiveState = {
            status: json.data.status,
            analysis: json.data.analysis,
            hasPolicies: json.data.hasPolicies,
          };
          setState(next);
          if (isSettled(next)) {
            settledRef.current = true;
            return; // stop polling — reached a stable state
          }
        }
      } catch {
        // transient network error — keep polling on the same schedule
      }
      if (active && !settledRef.current) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
    // documentId is stable for the component's lifetime (one page per document).
  }, [documentId]);

  const qaReady = QA_READY_STATUSES.has(state.status);
  const failed = state.status === "FAILED";

  return (
    <div className="space-y-6">
      <div>
        <StatusBadge status={state.status} />
      </div>

      {state.analysis ? (
        <div className="space-y-4">
          <SummaryView analysis={state.analysis} />
          {state.analysis.detailed && <DetailedBrief detailed={state.analysis.detailed} />}
        </div>
      ) : failed ? (
        <div className="card border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Processing this document failed. The team has been notified. Contextual Q&amp;A is unavailable for
          this document.
        </div>
      ) : qaReady ? (
        state.hasPolicies ? (
          <div className="card bg-canvas p-4 text-sm text-slate-600 dark:text-slate-300">
            This document is indexed and ready for questions. The AI comparison against your organization&apos;s
            policies is queued and will appear here automatically once it completes — no need to refresh.
          </div>
        ) : (
          <div className="card bg-canvas p-4 text-sm text-slate-600 dark:text-slate-300">
            This document is indexed and ready for questions. No compliance policies have been uploaded for
            your organization yet, so no automatic AI comparison is available.{" "}
            <Link href="/policies" className="font-medium text-brand hover:underline">
              Upload a policy →
            </Link>
          </div>
        )
      ) : (
        <div className="card bg-canvas p-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="mb-3">
            This document is still being processed. Contextual Q&amp;A will be available once processing is
            complete — this page updates automatically, no need to refresh.
          </p>
          <ProcessingSteps status={state.status} hasPolicies={state.hasPolicies} />
        </div>
      )}

      <hr className="border-[var(--border)]" />

      {qaReady ? (
        <QuestionInterface documentId={documentId} />
      ) : (
        <section className="space-y-2">
          <h2 className="section-title">Contextual Q&amp;A</h2>
          <div className="card bg-canvas p-4 text-sm text-[var(--text-muted)]">
            {failed
              ? "Regulatory document processing failed. Contextual Q&A is unavailable for this document."
              : "Analysis is being prepared. Contextual Q&A will be available once processing is complete."}
          </div>
        </section>
      )}
    </div>
  );
}
