"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Desktop header nav item with an active-route surface treatment (DESIGN.md §9). */
export function AppNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
        active
          ? "bg-brand/10 text-brand"
          : "text-[var(--text-muted)] hover:bg-slate-100 hover:text-navy dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
