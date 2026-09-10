import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

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
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Gapture</span>
          <nav className="flex items-center gap-4 text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100">
              Dashboard
            </Link>
            <Link href="/policies" className="hover:text-slate-900 dark:hover:text-slate-100">
              Policies
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
