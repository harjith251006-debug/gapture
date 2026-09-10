import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegulatoryCard, type RegulatoryCardData } from "@/components/RegulatoryCard";

export const dynamic = "force-dynamic";

interface DocRow {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  regulatory_sources: { code: string; name: string } | { code: string; name: string }[] | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: docs }, { data: notifs }, { count: unread }] = await Promise.all([
    supabase
      .from("regulatory_documents")
      .select("id, title, status, published_at, regulatory_sources!inner(code, name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("notifications")
      .select("id, document_id, title, created_at, is_read")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);

  const documents: RegulatoryCardData[] = (docs ?? []).map((d) => {
    const row = d as DocRow;
    const src = Array.isArray(row.regulatory_sources) ? row.regulatory_sources[0] : row.regulatory_sources;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      publishedAt: row.published_at,
      source: src ? { code: src.code, name: src.name } : null,
    };
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="page-title">Welcome back 👋</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {unread
            ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`
            : "Here's your compliance overview. You're all caught up."}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent notifications</h2>
          <Link href="/notifications" className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        </div>
        {!notifs || notifs.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
            No notifications yet. New RBI &amp; SEBI regulatory changes appear here once analysed.
          </div>
        ) : (
          <ul className="card divide-y divide-[var(--border)] overflow-hidden">
            {notifs.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/regulations/${n.document_id}`}
                  className="flex items-start gap-3 px-3 py-3 hover:bg-brand/[0.03]"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-brand"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block break-words text-sm ${n.is_read ? "text-slate-700 dark:text-slate-300" : "font-semibold text-navy dark:text-slate-100"}`}
                    >
                      {n.title}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent regulatory documents</h2>
          <Link href="/regulations" className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--text-muted)]">Nothing detected yet.</div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <RegulatoryCard doc={doc} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
