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
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {unread ? `${unread} unread notification${unread === 1 ? "" : "s"}.` : "You're all caught up."}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent notifications</h2>
          <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {!notifs || notifs.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {notifs.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/regulations/${n.document_id}`}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-blue-600"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{n.title}</span>
                    <span className="block text-xs text-slate-400">
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
          <h2 className="text-sm font-medium">Recent regulatory documents</h2>
          <Link href="/regulations" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing detected yet.</p>
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
