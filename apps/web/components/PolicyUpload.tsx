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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 dark:border-slate-800 p-4">
      <div className="space-y-1">
        <label htmlFor="policy-title" className="block text-sm font-medium">
          Title (optional)
        </label>
        <input
          id="policy-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AML & KYC Policy 2026"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="policy-file" className="block text-sm font-medium">
          File (PDF, text, Markdown, PNG, JPEG — PDFs/images under 1 MB)
        </label>
        <input
          id="policy-file"
          type="file"
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,application/pdf,text/plain,text/markdown,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={!file || busy}
        className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload policy"}
      </button>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
