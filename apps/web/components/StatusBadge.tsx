/**
 * Status pills (DESIGN.md §28). The worker's many in-flight document states
 * collapse into three the user cares about — "Processing" / "Analysis ready"
 * / "Processing failed" — each with a semantic colour AND a label (never
 * colour alone, DESIGN.md §5.2 / §34).
 */

const READY = new Set(["COMPLETED"]);
const FAILED = new Set(["FAILED"]);

export function statusLabel(status: string): string {
  if (READY.has(status)) return "Analysis ready";
  if (FAILED.has(status)) return "Processing failed";
  return "Processing";
}

export function StatusBadge({ status }: { status: string }) {
  const tone = READY.has(status)
    ? "bg-success/10 text-success ring-1 ring-inset ring-success/20"
    : FAILED.has(status)
      ? "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20"
      : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          READY.has(status) ? "bg-success" : FAILED.has(status) ? "bg-danger" : "bg-slate-400"
        }`}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  );
}

export function SourceBadge({ code }: { code: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-brand/30 bg-brand/5 px-2 py-0.5 text-xs font-semibold text-brand">
      {code}
    </span>
  );
}
