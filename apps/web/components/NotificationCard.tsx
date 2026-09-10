"use client";

import Link from "next/link";

export interface NotificationData {
  id: string;
  documentId: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * One row in the notification feed. `title`/`description` are the captured
 * 1-Line / Summary from the analysis (denormalised — DB Schema §4.1). The
 * full Detailed output lives on the document detail view, linked below.
 */
export function NotificationCard({
  notification,
  expanded,
  onToggle,
}: {
  notification: NotificationData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const n = notification;
  return (
    <li className={n.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-blue-600"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{n.title}</span>
          <span className="block text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
          {expanded && (
            <span className="mt-2 block whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
              {n.description}
              <Link
                href={`/regulations/${n.documentId}`}
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
  );
}
