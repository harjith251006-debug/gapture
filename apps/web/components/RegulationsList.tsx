"use client";

import { useCallback, useEffect, useState } from "react";
import { RegulatoryCard, type RegulatoryCardData } from "@/components/RegulatoryCard";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "RBI", label: "RBI" },
  { value: "SEBI", label: "SEBI" },
];
const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "COMPLETED", label: "Analysis ready" },
  { value: "ANALYZING", label: "Processing" },
  { value: "FAILED", label: "Failed" },
];

export function RegulationsList() {
  const [items, setItems] = useState<RegulatoryCardData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(
    async (opts: { cursor?: string; source: string; status: string }) => {
      const params = new URLSearchParams();
      if (opts.cursor) params.set("cursor", opts.cursor);
      if (opts.source) params.set("source", opts.source);
      if (opts.status) params.set("status", opts.status);
      try {
        const res = await fetch(`/api/documents?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          setError(true);
          return;
        }
        setError(false);
        setItems((prev) => (opts.cursor ? [...prev, ...json.data] : json.data));
        setNextCursor(json.nextCursor ?? null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      await load({ source: "", status: "" });
      if (!active) return;
    })();
    return () => {
      active = false;
    };
    // Initial load only; filter changes are handled in applyFilter below.
  }, [load]);

  function applyFilter(next: { source: string; status: string }) {
    setSource(next.source);
    setStatus(next.status);
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    void load(next);
  }

  function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    void load({ cursor: nextCursor, source, status });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={source}
          onChange={(e) => applyFilter({ source: e.target.value, status })}
          className="field !w-auto !py-1.5"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => applyFilter({ source, status: e.target.value })}
          className="field !w-auto !py-1.5"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-sm text-danger">Couldn&apos;t load regulations. Refresh to try again.</p>
      ) : loading && items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
          No regulatory documents match this filter.
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((doc) => (
              <li key={doc.id}>
                <RegulatoryCard doc={doc} />
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button type="button" onClick={loadMore} disabled={loading} className="btn-secondary !py-1.5">
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
