import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";

/**
 * Belt-and-suspenders check: middleware.ts already redirects unauthenticated
 * requests away from anything under this route group, but a Server
 * Component-level check ensures the same holds even if middleware's matcher
 * is ever narrowed by mistake.
 *
 * Navigation: a top bar on `sm`+ screens, a fixed bottom tab bar on phones
 * (<MobileNav/>).
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
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Gapture</span>
          <nav className="hidden items-center gap-4 text-sm text-slate-500 sm:flex">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100">
              Dashboard
            </Link>
            <Link href="/regulations" className="hover:text-slate-900 dark:hover:text-slate-100">
              Regulations
            </Link>
            <Link href="/policies" className="hover:text-slate-900 dark:hover:text-slate-100">
              Policies
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block">
            <NotificationBell />
          </span>
          <span className="hidden text-slate-500 md:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 pb-24 sm:p-6 sm:pb-10">{children}</main>

      <MobileNav />
    </div>
  );
}
