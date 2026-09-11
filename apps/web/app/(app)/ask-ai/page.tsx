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

/**
 * Ask AI (FT-07 §7) entry point. Contextual Q&A is grounded in one
 * document's own embedded chunks (see /api/qa), so this is a picker into
 * the existing <QuestionInterface/> on the regulation detail page — no new
 * chat backend, no generic cross-document chatbot.
 */
export default async function AskAiPage() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("regulatory_documents")
    .select("id, title, status, published_at, regulatory_sources!inner(code, name)")
    .in("status", ["ANALYZING", "COMPLETED"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

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
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="page-title">Ask CaptureAI</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Get instant, grounded answers from your regulatory documents. Choose a regulation below to ask questions
          about it.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
          No regulation is ready for questions yet. Documents become askable once they&apos;re indexed.
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <RegulatoryCard doc={doc} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
