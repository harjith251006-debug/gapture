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
      className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
    >
      Notifications
      {unread ? (
        <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
