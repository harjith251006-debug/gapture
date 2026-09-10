"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Header notification bell — shows the unread count, links to /notifications.
 * Polls every 60s (in-app only, no push — PRD FR-19). Phase 11 / Phase 12.
 */
export function NotificationBell() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const json = await res.json();
        if (active) setUnread(json.data?.unread ?? 0);
      } catch {
        // transient — keep the last known value
      }
    }
    poll();
    const timer = setInterval(poll, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-navy hover:border-brand/40 hover:text-brand dark:text-slate-200"
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
    >
      <span aria-hidden>🔔</span>
      Alerts
      {unread ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
