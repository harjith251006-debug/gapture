import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";

/**
 * Belt-and-suspenders check: middleware.ts already redirects unauthenticated
 * requests away from anything under this route group, but a Server
 * Component-level check ensures the same holds even if middleware's matcher
 * is ever narrowed by mistake.
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
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-semibold">Gapture</span>
          <nav className="flex items-center gap-4 text-sm text-slate-500">
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
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <NotificationBell />
          <span className="hidden text-slate-500 sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
