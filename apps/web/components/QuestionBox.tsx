"use client";

import { useEffect, useState } from "react";

interface QaItem {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

/**
 * Minimal contextual Q&A entry point (PRD FR-23). The route (`POST /api/qa`)
 * and retrieval service already exist (Phase 10); Phase 13 refines the
 * retrieval blend and prompt and adds the voice path (Phase 14).
 */
export function QuestionBox({ documentId }: { documentId: string }) {
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
        { id: json.data.id, question: q, answer: json.data.answer, createdAt: json.data.createdAt },
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
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {history.length > 0 && (
        <ul className="space-y-3">
          {history.map((qa) => (
            <li key={qa.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-medium">{qa.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{qa.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
