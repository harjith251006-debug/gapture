import Link from "next/link";
import { SourceBadge, StatusBadge } from "@/components/StatusBadge";

export interface RegulatoryCardData {
  id: string;
  title: string;
  status: string;
  publishedAt: string | null;
  source: { code: string; name: string } | null;
}

export function RegulatoryCard({ doc }: { doc: RegulatoryCardData }) {
  return (
    <Link
      href={`/regulations/${doc.id}`}
      className="card block p-3.5 transition-colors hover:border-brand/40 hover:bg-brand/[0.03]"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <SourceBadge code={doc.source?.code ?? null} />
        <StatusBadge status={doc.status} />
        {doc.publishedAt && (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(doc.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="break-words text-sm font-medium leading-snug text-navy dark:text-slate-100">{doc.title}</p>
    </Link>
  );
}
