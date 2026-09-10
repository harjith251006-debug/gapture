"use client";

import { useState } from "react";

/**
 * "Brief of Detailed NLP Data" (PRD FR-20's "brief"). Rendered from
 * `detailed_output`. It can be long, so it's collapsed by default with a
 * toggle — this is the one bit of interactivity, hence a Client Component.
 */
export function DetailedBrief({ detailed }: { detailed: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
        aria-expanded={open}
      >
        <span>Detailed analysis</span>
        <span className="text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {detailed}
        </div>
      )}
    </section>
  );
}
