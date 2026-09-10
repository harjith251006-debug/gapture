/**
 * Processing-status pill for a regulatory document. The worker's state model
 * is DETECTED -> RETRIEVED -> OCR_PROCESSING -> SECURED -> STORED -> CLEANING
 * -> INDEXING -> ANALYZING -> COMPLETED (+ FAILED). Users only care about
 * "still working" vs "ready" vs "problem", so the many in-flight states are
 * collapsed into one "Processing" label.
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
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    : FAILED.has(status)
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

export function SourceBadge({ code }: { code: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
      {code}
    </span>
  );
}
