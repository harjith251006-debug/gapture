"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar/header nav item with the FT-07 §3.1 selected-state treatment: light green surface, dark text. */
export function AppNavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-[var(--radius-btn)] font-medium transition-colors ${
        active
          ? "bg-[var(--color-green-tint)] text-navy dark:bg-brand/15 dark:text-white"
          : "text-[var(--text-muted)] hover:bg-slate-100 hover:text-navy dark:hover:bg-slate-800 dark:hover:text-white"
      } ${className || "px-3 py-1.5"}`}
    >
      {children}
    </Link>
  );
}
