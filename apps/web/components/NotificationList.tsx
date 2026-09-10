"use client";

import { useCallback, useEffect, useState } from "react";
import { NotificationCard, type NotificationData } from "@/components/NotificationCard";

/**
 * Notification feed with mark-as-read. Clicking a row expands the captured
 * summary and optimistically marks it read.
 */
export function NotificationList() {
  const [items, setItems] = useState<NotificationData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/notifications?cursor=${encodeURIComponent(cursor)}` : "/api/notifications";
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setError(true);
        return;
      }
      setItems((prev) => (cursor ? [...prev, ...json.data] : json.data));
      setNextCursor(json.nextCursor ?? null);
    } catch {
      setError(true);
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
      // optimistic update stands; unread count reconciles on next poll
    }
  }

  function toggle(n: NotificationData) {
    setExpanded((cur) => (cur === n.id ? null : n.id));
    if (!n.isRead) void markRead(n.id);
  }

  if (error) {
    return <p className="text-sm text-red-600">Couldn&apos;t load notifications. Refresh to try again.</p>;
  }
  if (loading && items.length === 0) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No notifications yet.</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {items.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            expanded={expanded === n.id}
            onToggle={() => toggle(n)}
          />
        ))}
      </ul>
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadMore(nextCursor)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
