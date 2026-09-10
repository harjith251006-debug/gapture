"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Minimal policy upload control — posts to /api/policies. The full upload UX
 * (drag/drop, progress, per-policy detail) is Phase 12; this is just enough
 * to exercise the Phase 8 pipeline from the browser.
 */
export function PolicyUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);

    const body = new FormData();
    body.set("file", file);
    if (title.trim()) body.set("title", title.trim());

    try {
      const res = await fetch("/api/policies", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: json.error?.message ?? `Upload failed (${res.status})` });
      } else {
        const p = json.data;
        setMessage({
          kind: "ok",
          text: p.warning ? `Uploaded "${p.title}" — ${p.warning}` : `Uploaded "${p.title}". Processing…`,
        });
        setFile(null);
        setTitle("");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch {
      setMessage({ kind: "err", text: "Network error during upload" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div className="space-y-1">
        <label htmlFor="policy-title" className="block text-sm font-medium text-navy dark:text-slate-200">
          Title (optional)
        </label>
        <input
          id="policy-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AML & KYC Policy 2026"
          className="field"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="policy-file" className="block text-sm font-medium text-navy dark:text-slate-200">
          File (PDF, text, Markdown, PNG, JPEG — PDFs/images under 1 MB)
        </label>
        <input
          id="policy-file"
          type="file"
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,application/pdf,text/plain,text/markdown,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-[var(--radius-btn)] file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
        />
      </div>
      <button type="submit" disabled={!file || busy} className="btn-primary">
        {busy ? "Uploading…" : "Upload policy"}
      </button>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}
    </form>
  );
}
