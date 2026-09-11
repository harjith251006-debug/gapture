import { createClient } from "@/lib/supabase/server";
import { SourceIcon } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

interface SourceRow {
  id: string;
  code: string;
  name: string;
  website_url: string;
  is_active: boolean;
}

interface LatestDocRow {
  source_id: string;
  title: string;
  published_at: string | null;
}

/**
 * Regulatory Sources (FT-07 §8/§14) — a calm source-monitoring view for RBI
 * and SEBI. Reads the same `regulatory_sources` table the worker's adapters
 * and demo run already use; no new backend logic.
 */
export default async function SourcesPage() {
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("regulatory_sources")
    .select("id, code, name, website_url, is_active")
    .order("code", { ascending: true });

  const { data: latestDocs } = await supabase
    .from("regulatory_documents")
    .select("source_id, title, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const latestBySource = new Map<string, LatestDocRow>();
  for (const d of (latestDocs ?? []) as LatestDocRow[]) {
    if (!latestBySource.has(d.source_id)) latestBySource.set(d.source_id, d);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-1">
        <h1 className="page-title">Regulatory Sources</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Gapture continuously monitors these regulators for new circulars, notifications and guidelines.
        </p>
      </div>

      {!sources || sources.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--text-muted)]">No sources configured.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(sources as SourceRow[]).map((s) => {
            const latest = latestBySource.get(s.id);
            return (
              <li key={s.id} className="card space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <SourceIcon code={s.code} className="h-6 w-6" />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-navy dark:text-slate-100">{s.code}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{s.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${s.is_active ? "bg-success" : "bg-slate-400"}`}
                    aria-hidden
                  />
                  <span className={s.is_active ? "font-medium text-success" : "font-medium text-[var(--text-muted)]"}>
                    {s.is_active ? "Active — Monitoring" : "Inactive"}
                  </span>
                </div>

                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Latest detected
                  </p>
                  {latest ? (
                    <p className="mt-1 break-words text-sm text-navy dark:text-slate-200">{latest.title}</p>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Nothing detected yet.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
