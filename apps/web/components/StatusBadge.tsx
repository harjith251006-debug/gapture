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

function BankIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 10 12 4l9 6M4 10h16v9H4v-9ZM4 19h16M8 13v4M12 13v4M16 13v4" />
    </svg>
  );
}
function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

/** Source-specific icon treatment (FT-07 §9) — RBI green, SEBI teal — same shared visual system. */
export function SourceIcon({ code, className = "h-5 w-5" }: { code: string | null; className?: string }) {
  const isSebi = code === "SEBI";
  const Icon = isSebi ? TrendIcon : BankIcon;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
        isSebi
          ? "bg-teal/10 text-teal dark:bg-teal/15"
          : "bg-[var(--color-green-tint)] text-brand dark:bg-brand/15"
      }`}
    >
      <Icon className={className} />
    </span>
  );
}
