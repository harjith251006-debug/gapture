"use client";

import { useEffect, useState } from "react";

interface QaItem {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  /** Only present for answers asked in this session. */
  answered?: boolean;
  sources?: { regulation: number; policy: number };
}

/**
 * Contextual Q&A (PRD FR-23). Every answer is scoped to the document being
 * viewed and grounded in retrieved regulatory + policy context — the service
 * returns an explicit "couldn't answer" rather than a guess when retrieval
 * is thin (see @gapture/shared ContextualQaService).
 */
export function QuestionInterface({ documentId }: { documentId: string }) {
  const [history, setHistory] = useState<QaItem[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/qa/history?documentId=${documentId}`);
        const json = await res.json();
        if (active && res.ok) setHistory(json.data ?? []);
      } catch {
        // history is non-critical
      }
    })();
    return () => {
      active = false;
    };
  }, [documentId]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: q }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Couldn't get an answer. Try again.");
        return;
      }
      setHistory((prev) => [
        {
          id: json.data.id,
          question: q,
          answer: json.data.answer,
          createdAt: json.data.createdAt,
          answered: json.data.answered,
          sources: json.data.sources,
        },
        ...prev,
      ]);
      setQuestion("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ask about this document</h2>
      <form onSubmit={ask} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What action does this require, and by when?"
          className="flex-1 rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm dark:border-slate-700"
          aria-label="Your question about this document"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
      <p className="text-xs text-slate-400">
        Answers are grounded only in this document and your organization&apos;s policies.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {history.length > 0 && (
        <ul className="space-y-3">
          {history.map((qa) => (
            <li
              key={qa.id}
              className={`rounded-md border p-3 ${
                qa.answered === false
                  ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <p className="text-sm font-medium">{qa.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{qa.answer}</p>
              {qa.answered === false && (
                <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Not enough context to answer confidently
                </p>
              )}
              {qa.answered && qa.sources && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Based on {qa.sources.regulation} regulation excerpt
                  {qa.sources.regulation === 1 ? "" : "s"}
                  {qa.sources.policy > 0
                    ? ` and ${qa.sources.policy} policy excerpt${qa.sources.policy === 1 ? "" : "s"}`
                    : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
