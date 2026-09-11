import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SourceBadge } from "@/components/StatusBadge";
import type { AnalysisData } from "@/components/SummaryView";
import { RegulationLive } from "@/components/RegulationLive";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DetailRow {
  document_id: string;
  title: string;
  status: string;
  source_code: string | null;
  source_name: string | null;
  one_line_output: string | null;
  detailed_output: string | null;
  summary_output: string | null;
  analyzed_at: string | null;
}

export default async function RegulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) notFound();

  const { data, error } = await supabase.rpc("get_document_with_latest_analysis", {
    p_document_id: id,
    p_organization_id: organizationId,
  });
  if (error) throw new Error("Failed to load document");

  const row = ((data ?? []) as DetailRow[])[0];
  if (!row) notFound();

  const analysis: AnalysisData | null = row.one_line_output
    ? {
        oneLine: row.one_line_output,
        detailed: row.detailed_output ?? "",
        summary: row.summary_output ?? "",
        analyzedAt: row.analyzed_at,
      }
    : null;

  // Whether this org has ANY fully-processed policy — distinguishes "the
  // per-org comparison just hasn't run yet" (transient, worth polling for)
  // from "there is nothing to compare against" (stable — RegulationLive
  // stops polling and says so rather than implying it'll appear on its own).
  const { count: completedPolicyCount } = await supabase
    .from("compliance_policies")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "COMPLETED");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/regulations" className="text-sm font-medium text-brand hover:underline">
          ← Regulatory Intelligence
        </Link>
      </div>

      <header className="card space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge code={row.source_code} />
        </div>
        <h1 className="break-words text-lg font-bold leading-snug text-navy dark:text-slate-100 sm:text-xl">
          {row.title}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {row.source_name ?? "Regulatory source"} · Official regulatory document
        </p>
      </header>

      <RegulationLive
        documentId={row.document_id}
        initialStatus={row.status}
        initialAnalysis={analysis}
        initialHasPolicies={(completedPolicyCount ?? 0) > 0}
      />
    </div>
  );
}
