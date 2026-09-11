import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegulatoryCard, type RegulatoryCardData } from "@/components/RegulatoryCard";
import { MetricCard } from "@/components/MetricCard";
import { SourceIcon } from "@/components/StatusBadge";
import { DemoRunButton } from "@/components/DemoRunButton";

export const dynamic = "force-dynamic";

interface DocRow {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  regulatory_sources: { code: string; name: string } | { code: string; name: string }[] | null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isoTimeAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const since24h = isoTimeAgo(24 * 60 * 60 * 1000);

  const [{ data: docs }, { data: notifs }, { count: unread }, { data: recent24h }] = await Promise.all([
    supabase
      .from("regulatory_documents")
      .select("id, title, status, published_at, regulatory_sources!inner(code, name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("notifications")
      .select("id, document_id, title, description, created_at, is_read, regulatory_documents!inner(regulatory_sources!inner(code))")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
    // Last-24h counts by source, for the metric row (FT-07 §4.3) — real data, no fabricated numbers.
    supabase
      .from("notifications")
      .select("id, regulatory_documents!inner(regulatory_sources!inner(code))")
      .gte("created_at", since24h),
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

  type SourceJoin = { regulatory_sources: { code: string } | { code: string }[] } | null;
  const sourceCode = (doc: SourceJoin): string | undefined => {
    const src = Array.isArray(doc?.regulatory_sources) ? doc?.regulatory_sources[0] : doc?.regulatory_sources;
    return src?.code;
  };

  type Recent24hRow = { regulatory_documents: SourceJoin };
  const recentRows = (recent24h ?? []) as unknown as Recent24hRow[];
  const newCount = recentRows.length;
  const rbiCount = recentRows.filter((r) => sourceCode(r.regulatory_documents) === "RBI").length;
  const sebiCount = recentRows.filter((r) => sourceCode(r.regulatory_documents) === "SEBI").length;

  type NotifRow = {
    id: string;
    document_id: string;
    title: string;
    description: string;
    created_at: string;
    is_read: boolean;
    regulatory_documents: SourceJoin;
  };
  const notifRows = (notifs ?? []) as unknown as NotifRow[];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="page-title">{greeting()}!</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Stay ahead with the latest regulatory updates from RBI and SEBI.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="New Notifications"
          value={newCount}
          supportingText="Last 24 hours"
          href="/notifications"
          icon="document"
        />
        <MetricCard
          label="RBI Updates"
          value={rbiCount}
          supportingText="Last 24 hours"
          href="/notifications"
          icon="shield"
        />
        <MetricCard
          label="SEBI Updates"
          value={sebiCount}
          supportingText="Last 24 hours"
          href="/notifications"
          icon="chart"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Latest notifications</h2>
              <Link href="/notifications" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            </div>
            {notifRows.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
                No new regulatory notifications. New RBI &amp; SEBI regulatory changes appear here once analysed.
              </div>
            ) : (
              <ul className="card divide-y divide-[var(--border)] overflow-hidden">
                {notifRows.map((n) => {
                  const code = sourceCode(n.regulatory_documents) ?? null;
                  return (
                    <li key={n.id}>
                      <Link
                        href={`/regulations/${n.document_id}`}
                        className={`flex items-start gap-3 px-4 py-4 hover:bg-brand/[0.03] ${n.is_read ? "" : "bg-brand/[0.02]"}`}
                      >
                        <SourceIcon code={code} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            {code && (
                              <span className="text-xs font-semibold text-brand">{code}</span>
                            )}
                            {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
                          </span>
                          <span
                            className={`block break-words text-sm ${n.is_read ? "text-slate-700 dark:text-slate-300" : "font-semibold text-navy dark:text-slate-100"}`}
                          >
                            {n.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                            {n.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-[var(--text-muted)]">
                          {new Date(n.created_at).toLocaleDateString()}
                          <span aria-hidden>→</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
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

        <aside className="space-y-4">
          <div className="card space-y-2 p-4">
            <h2 className="section-title">Compliance Summary</h2>
            <p className="text-xs text-[var(--text-muted)]">
              An aggregate compliance score isn&apos;t part of the product yet. Open any regulatory document to see
              its AI comparison against your organization&apos;s uploaded policies.
            </p>
          </div>

          <div className="card space-y-2 p-4">
            <h2 className="section-title">Ask CaptureAI</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Get instant answers from your regulatory documents.
            </p>
            <Link href="/ask-ai" className="btn-primary mt-1 w-full">
              Open a regulation to ask
            </Link>
          </div>

          <div className="card space-y-1.5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {unread
                ? `${unread} unread notification${unread === 1 ? "" : "s"}`
                : "You're all caught up"}
            </p>
            <p className="text-sm text-navy dark:text-slate-200">
              Gapture AI — <span className="font-semibold">Gaps, Captured.</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Continuous RBI &amp; SEBI monitoring, compared against your organization&apos;s compliance policies.
            </p>
          </div>

          <DemoRunButton />
        </aside>
      </div>
    </div>
  );
}
