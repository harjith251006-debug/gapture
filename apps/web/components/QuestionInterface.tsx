"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";
import { AILabel } from "@/components/AILabel";
import { MarkdownContent } from "@/components/MarkdownContent";

interface QaItem {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  answered?: boolean;
  sources?: { regulation: number; policy: number };
}

/**
 * Contextual Q&A (PRD FR-23) with an optional voice modality (Phase 14).
 * Typed and spoken questions run the exact same flow; a spoken question also
 * plays the answer back (ElevenLabs -> OpenAI TTS -> text-only, handled
 * server-side). Every answer is scoped to this document and grounded in
 * retrieved context.
 */
export function QuestionInterface({ documentId }: { documentId: string }) {
  const [history, setHistory] = useState<QaItem[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/qa/history?documentId=${documentId}`);
        const json = await res.json();
        if (active && res.ok) setHistory(json.data ?? []);
      } catch {
        /* history is non-critical */
      }
    })();
    return () => {
      active = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [documentId]);

  const playAnswer = useCallback(async (text: string) => {
    setSpeaking(true);
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return; // text answer is already on screen — silent fallback
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      await audio.play();
    } catch {
      /* silent fallback to text */
    } finally {
      // onended handles the happy path; guard the failure path
      setTimeout(() => setSpeaking(false), 100);
    }
  }, []);

  const ask = useCallback(
    async (raw: string, opts: { spoken?: boolean } = {}) => {
      const q = raw.trim();
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
        const item: QaItem = {
          id: json.data.id,
          question: q,
          answer: json.data.answer,
          createdAt: json.data.createdAt,
          answered: json.data.answered,
          sources: json.data.sources,
        };
        setHistory((prev) => [item, ...prev]);
        setQuestion("");
        if (opts.spoken) void playAnswer(item.answer);
      } catch {
        setError("Network error. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, documentId, playAnswer],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Contextual Q&amp;A</h2>
        <AILabel />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What has changed, and what do we need to update in our policies?"
          className="field flex-1"
          aria-label="Your question about this document"
        />
        <button type="submit" disabled={busy || question.trim().length < 3} className="btn-primary">
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <VoiceButton
          onTranscript={(text) => {
            setQuestion(text);
            void ask(text, { spoken: true });
          }}
          disabled={busy}
        />
        {speaking && <span className="text-xs text-ai">✦ Gapture AI is responding…</span>}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Answers are grounded only in this document and your organization&apos;s policies.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {history.length > 0 && (
        <ul className="space-y-3">
          {history.map((qa) => (
            <li
              key={qa.id}
              className={`rounded-[var(--radius-card)] border p-3.5 ${
                qa.answered === false
                  ? "border-warning/40 bg-warning/[0.06]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <p className="break-words text-sm font-semibold text-navy dark:text-slate-100">{qa.question}</p>
              <div className="mt-1">
                <MarkdownContent className="break-words">{qa.answer}</MarkdownContent>
              </div>
              {qa.answered === false && (
                <p className="mt-1.5 text-xs font-semibold text-warning">
                  Not enough context to answer confidently
                </p>
              )}
              {qa.answered && qa.sources && (
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
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
