"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface DemoProgressEvent {
  type: "demo-progress";
  demoRunId?: string;
  stage: string;
  message: string;
  source?: "RBI" | "SEBI";
  ok?: boolean;
}

/**
 * "Run Live Demo" — manually triggers POST /api/demo/run (worker/src/demo),
 * which replays the latest live RBI + SEBI RSS item through the exact same
 * production pipeline (OCR -> clean/chunk -> embed -> NLP analysis ->
 * notifications). Streams NDJSON progress lines and shows them as a simple
 * live log; refreshes the dashboard once finished so the new demo
 * notification/analysis appears via the existing rendering.
 */
export function DemoRunButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<DemoProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setEvents([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/demo/run", { method: "POST", signal: controller.signal });
      if (!res.ok || !res.body) {
        setError(`Demo run failed to start (HTTP ${res.status}).`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as DemoProgressEvent;
            setEvents((prev) => [...prev, event]);
          } catch {
            // ignore a malformed line rather than break the whole log
          }
        }
      }

      router.refresh();
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Network error while running the demo. Check the server logs and try again.");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Live demo</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Fetches the latest real RBI and SEBI circular and runs each through the full pipeline —
            OCR, cleaning, embedding, NLP analysis, and notifications.
          </p>
        </div>
        <button type="button" onClick={run} disabled={running} className="btn-primary shrink-0 whitespace-nowrap">
          {running ? "Running…" : "▶ Run Live Demo"}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {events.length > 0 && (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-[var(--radius-btn)] border border-[var(--border)] bg-canvas p-3 text-sm">
          {events.map((e, i) => (
            <li
              key={i}
              className={
                e.ok === false
                  ? "text-danger"
                  : e.stage === "done"
                    ? "font-semibold text-success"
                    : "text-slate-700 dark:text-slate-300"
              }
            >
              {e.source ? `[${e.source}] ` : ""}
              {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
