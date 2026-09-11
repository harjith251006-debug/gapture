"use client";

import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { AppNavLink } from "@/components/AppNavLink";

/**
 * Persistent left navigation (design spec §4/§15). Desktop/tablet only —
 * phones keep <MobileNav/>'s bottom tab bar. Every item routes to a real,
 * already-existing page/data source — nothing here is a mock destination.
 */

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
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
function SourcesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 10 12 4l9 6M4 10h16v9H4v-9ZM4 19h16M8 13v4M12 13v4M16 13v4" />
    </svg>
  );
}
function AskAiIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.5 9 9 0 0 1-3.4-.7L3 21l1.7-4.3A8.3 8.3 0 0 1 3.6 12 8.4 8.4 0 0 1 12.4 3.5 8.5 8.5 0 0 1 21 11.5Z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/notifications", label: "Notifications", Icon: AlertsIcon },
  { href: "/sources", label: "Regulatory Sources", Icon: SourcesIcon },
  { href: "/regulations", label: "Documents", Icon: RegulationsIcon },
  { href: "/policies", label: "Policies", Icon: PoliciesIcon },
  { href: "/ask-ai", label: "Ask AI", Icon: AskAiIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] sm:flex">
      <div className="px-5 py-6">
        <BrandLogo variant="full" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <AppNavLink key={href} href={href} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand" : "text-[var(--text-muted)]"}`} />
              {label}
            </AppNavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <div className="rounded-[var(--radius-card)] border border-brand/20 bg-[var(--color-green-tint)] p-3 dark:border-brand/25 dark:bg-brand/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span className="text-xs font-semibold text-navy dark:text-slate-100">Continuous Monitoring</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">Actively watching RBI &amp; SEBI</p>
        </div>
        <p className="mt-3 px-1 text-[11px] text-[var(--text-muted)]">© {new Date().getFullYear()} Gapture AI</p>
      </div>
    </aside>
  );
}
