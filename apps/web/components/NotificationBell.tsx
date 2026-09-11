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
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-navy dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {unread ? (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
