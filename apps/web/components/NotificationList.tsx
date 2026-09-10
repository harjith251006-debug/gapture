"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  documentId: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Notification feed with mark-as-read. Clicking a row expands the captured
 * summary and marks it read; the "View document" link goes to the regulatory
 * detail view (Phase 12), where the full Detailed output is fetched — it is
 * deliberately not duplicated onto the notification row (DB Schema §20).
 */
export function NotificationList() {
  const [items, setItems] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/notifications?cursor=${encodeURIComponent(cursor)}` : "/api/notifications";
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setItems((prev) => (cursor ? [...prev, ...json.data] : json.data));
        setNextCursor(json.nextCursor ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load]);

  function loadMore(cursor: string) {
    setLoading(true);
    void load(cursor);
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch {
      // optimistic update stands; the count reconciles on next poll
    }
  }

  function toggle(n: Notification) {
    setExpanded((cur) => (cur === n.id ? null : n.id));
    if (!n.isRead) void markRead(n.id);
  }

  if (loading && items.length === 0) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No notifications yet.</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800">
        {items.map((n) => (
          <li key={n.id} className={n.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"}>
            <button
              type="button"
              onClick={() => toggle(n)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-blue-600"}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{n.title}</span>
                <span className="block text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
                {expanded === n.id && (
                  <span className="mt-2 block whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {n.description}
                    <Link
                      href={`/documents/${n.documentId}`}
                      className="mt-2 block text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View document →
                    </Link>
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadMore(nextCursor)}
          disabled={loading}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
