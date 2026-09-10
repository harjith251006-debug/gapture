import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
import { BrandLogo } from "@/components/BrandLogo";
import { AppNavLink } from "@/components/AppNavLink";

/**
 * Authenticated app shell (DESIGN.md §9). Top bar on `sm`+ screens, fixed
 * bottom tab bar on phones (<MobileNav/>). Belt-and-suspenders auth check —
 * middleware also guards this route group.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <BrandLogo />
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <AppNavLink href="/dashboard">Dashboard</AppNavLink>
              <AppNavLink href="/regulations">Regulatory</AppNavLink>
              <AppNavLink href="/policies">Policies</AppNavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block">
              <NotificationBell />
            </span>
            <span className="hidden max-w-[16ch] truncate text-[var(--text-muted)] md:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10">{children}</main>

      <footer className="hidden border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-xs text-[var(--text-muted)] sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span>From regulations to resolution — <strong className="text-navy dark:text-slate-200">Gaps, Captured.</strong></span>
          <span>Gapture AI · Regulatory Compliance Intelligence</span>
        </div>
      </footer>

      <MobileNav />
    </div>
  );
}
