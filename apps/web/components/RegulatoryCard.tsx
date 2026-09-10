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
      className="block rounded-md border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <SourceBadge code={doc.source?.code ?? null} />
        <StatusBadge status={doc.status} />
        {doc.publishedAt && (
          <span className="text-xs text-slate-400">
            {new Date(doc.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="text-sm leading-snug">{doc.title}</p>
    </Link>
  );
}
