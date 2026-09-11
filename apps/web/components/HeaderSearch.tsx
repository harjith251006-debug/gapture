"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Global header search (FT-07 §3.2). Submits to the Notifications feed,
 * which client-filters its already-loaded rows by the query — no new
 * backend endpoint.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/notifications?q=${encodeURIComponent(q)}` : "/notifications");
  }

  return (
    <form onSubmit={onSubmit} className="hidden w-full max-w-sm md:block">
      <label className="relative block">
        <span className="sr-only">Search notifications, documents</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search notifications, documents…"
          className="field pl-9"
        />
      </label>
    </form>
  );
}
