import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
import { BrandLogo } from "@/components/BrandLogo";
import { Sidebar } from "@/components/Sidebar";
import { HeaderSearch } from "@/components/HeaderSearch";

/**
 * Authenticated app shell (FT-07 §3–4). Persistent left sidebar on `sm`+
 * screens (<Sidebar/>) with a slim top header (search + bell + account);
 * fixed bottom tab bar on phones (<MobileNav/>). Belt-and-suspenders auth
 * check — middleware also guards this route group.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />

      <div className="flex min-h-dvh flex-1 flex-col sm:pl-60">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <span className="sm:hidden">
              <BrandLogo />
            </span>
            <HeaderSearch />
            <div className="flex items-center gap-3 text-sm">
              <NotificationBell />
              <span className="hidden items-center gap-2 md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-green-tint)] text-xs font-semibold text-brand dark:bg-brand/15">
                  {initials}
                </span>
                <span className="max-w-[16ch] truncate text-[var(--text-muted)]">{user.email}</span>
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="w-full flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <footer className="hidden border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-xs text-[var(--text-muted)] sm:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span>
              From regulations to resolution — <strong className="text-navy dark:text-slate-200">Gaps, Captured.</strong>
            </span>
            <span>Gapture AI · Regulatory Compliance Intelligence</span>
          </div>
        </footer>
      </div>

      <MobileNav />
    </div>
  );
}
