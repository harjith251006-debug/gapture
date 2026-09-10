"use client";

import { useRef, useState } from "react";

type State = "idle" | "recording" | "transcribing";

/**
 * Microphone capture -> POST /api/voice/transcribe -> onTranscript(text).
 * The caller feeds that text into the existing Q&A flow (voice is I/O around
 * Contextual Q&A, not a separate pipeline — HLSA §13). Speaking the answer
 * back is the caller's job.
 */
export function VoiceButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission was denied.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (blob.size < 400) {
        setState("idle");
        setError("That recording was too short.");
        return;
      }
      setState("transcribing");
      try {
        const form = new FormData();
        form.set("audio", blob, "question.webm");
        const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "Couldn't transcribe that.");
        } else if (json.data?.text) {
          onTranscript(json.data.text);
        }
      } catch {
        setError("Network error during transcription.");
      } finally {
        setState("idle");
      }
    };
    recorder.start();
    setState("recording");
  }

  function stop() {
    recorderRef.current?.stop();
  }

  const label =
    state === "recording" ? "Stop & ask" : state === "transcribing" ? "Transcribing…" : "🎙 Ask by voice";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={disabled || state === "transcribing"}
        className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${
          state === "recording"
            ? "border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
            : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
        }`}
        aria-pressed={state === "recording"}
      >
        {label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
