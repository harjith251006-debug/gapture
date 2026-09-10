"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fixed bottom navigation — the primary way around the app on a phone
 * (hidden at `sm` and up, where the header nav takes over). Four
 * destinations; "Alerts" carries the unread-notification badge.
 */

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function RegulationsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v6h6M8.5 13h7M8.5 17h7" />
    </svg>
  );
}
function PoliciesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function AlertsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

const TABS = [
  { href: "/dashboard", label: "Home", Icon: DashboardIcon },
  { href: "/regulations", label: "Regulations", Icon: RegulationsIcon },
  { href: "/policies", label: "Policies", Icon: PoliciesIcon },
  { href: "/notifications", label: "Alerts", Icon: AlertsIcon, badge: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const json = await res.json();
        if (active) setUnread(json.data?.unread ?? 0);
      } catch {
        /* keep last value */
      }
    }
    poll();
    const timer = setInterval(poll, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ href, label, Icon, badge }) => {
        const activeTab = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activeTab ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
              activeTab ? "text-brand" : "text-[var(--text-muted)]"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {badge && unread > 0 && (
                <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
