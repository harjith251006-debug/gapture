"use client";

import { useState } from "react";
import { AILabel } from "@/components/AILabel";

/**
 * "Brief of Detailed NLP Data" (PRD FR-20, DESIGN.md §13). Long-form, so it
 * is collapsed by default with a toggle — the one bit of interactivity here.
 */
export function DetailedBrief({ detailed }: { detailed: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-btn)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm font-semibold text-navy transition-colors hover:border-ai/40 dark:text-slate-200"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          Detailed analysis
          <AILabel>AI</AILabel>
        </span>
        <span className="text-[var(--text-muted)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="ai-surface mt-2 whitespace-pre-wrap break-words rounded-r-[var(--radius-card)] bg-ai/[0.04] p-4 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {detailed}
        </div>
      )}
    </section>
  );
}
