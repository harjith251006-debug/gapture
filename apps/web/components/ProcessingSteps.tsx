/**
 * Real processing-stage checklist for a regulatory document, built only
 * from the actual `regulatory_documents.status` pipeline
 * (DETECTED -> RETRIEVED -> OCR_PROCESSING -> SECURED -> STORED -> CLEANING
 * -> INDEXING -> ANALYZING -> COMPLETED, or FAILED). No stage here is
 * invented or estimated — each is a real status transition the worker
 * actually records in `document_processing_events`.
 */

const PIPELINE_ORDER = [
  "DETECTED",
  "RETRIEVED",
  "OCR_PROCESSING",
  "SECURED",
  "STORED",
  "CLEANING",
  "INDEXING",
  "ANALYZING",
  "COMPLETED",
] as const;

function stageIndex(status: string): number {
  const i = PIPELINE_ORDER.indexOf(status as (typeof PIPELINE_ORDER)[number]);
  return i === -1 ? 0 : i;
}

const STEPS: { label: string; atLeast: (typeof PIPELINE_ORDER)[number] }[] = [
  { label: "Retrieved from source", atLeast: "RETRIEVED" },
  { label: "Text extracted & encrypted", atLeast: "STORED" },
  { label: "Cleaned & chunked", atLeast: "INDEXING" },
  { label: "Indexed for retrieval (Q&A ready)", atLeast: "ANALYZING" },
];

export function ProcessingSteps({ status, hasPolicies }: { status: string; hasPolicies: boolean }) {
  const idx = stageIndex(status);
  const qaReady = idx >= stageIndex("ANALYZING");

  return (
    <ul className="space-y-1.5 text-sm">
      {STEPS.map((step) => {
        const done = idx >= stageIndex(step.atLeast);
        return (
          <li key={step.label} className="flex items-center gap-2">
            <span className={done ? "text-success" : "text-[var(--text-muted)]"} aria-hidden>
              {done ? "✓" : "→"}
            </span>
            <span className={done ? "text-navy dark:text-slate-200" : "text-[var(--text-muted)]"}>{step.label}</span>
          </li>
        );
      })}
      <li className="flex items-center gap-2">
        <span className={qaReady ? "text-success" : "text-[var(--text-muted)]"} aria-hidden>
          {qaReady ? "✓" : "→"}
        </span>
        <span className={qaReady ? "text-navy dark:text-slate-200" : "text-[var(--text-muted)]"}>
          {hasPolicies
            ? "Compared against your organization's policies"
            : "Policy comparison (upload a compliance policy to enable)"}
        </span>
      </li>
    </ul>
  );
}
