import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SourceBadge, StatusBadge, statusLabel } from "@/components/StatusBadge";
import { SummaryView, type AnalysisData } from "@/components/SummaryView";
import { DetailedBrief } from "@/components/DetailedBrief";
import { QuestionInterface } from "@/components/QuestionInterface";

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/regulations" className="text-sm text-blue-600 hover:underline">
          ← All regulations
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge code={row.source_code} />
          <StatusBadge status={row.status} />
        </div>
        <h1 className="text-lg font-semibold leading-snug">{row.title}</h1>
        {row.source_name && <p className="text-sm text-slate-500">{row.source_name}</p>}
      </header>

      {analysis ? (
        <>
          <SummaryView analysis={analysis} />
          {analysis.detailed && <DetailedBrief detailed={analysis.detailed} />}
        </>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {row.status === "FAILED"
            ? "Processing this document failed. The team has been notified."
            : `This document is still being processed (${statusLabel(row.status).toLowerCase()}). The analysis against your organization's policies will appear here once it's ready.`}
        </div>
      )}

      <hr className="border-slate-200 dark:border-slate-800" />

      <QuestionInterface documentId={row.document_id} />
    </div>
  );
}
