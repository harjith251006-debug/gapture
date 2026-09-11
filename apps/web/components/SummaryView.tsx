import { AILabel } from "@/components/AILabel";
import { MarkdownContent } from "@/components/MarkdownContent";

/**
 * The 1-Line + Summary outputs (PRD FR-20, DESIGN.md §13). Visually marked as
 * AI-generated and set apart from the regulatory source. `detailed_output` is
 * rendered separately by DetailedBrief.
 */

export interface AnalysisData {
  oneLine: string;
  detailed: string;
  summary: string;
  analyzedAt: string | null;
}

export function SummaryView({ analysis }: { analysis: AnalysisData }) {
  return (
    <div className="ai-surface rounded-r-[var(--radius-card)] bg-ai/[0.04] p-4 pl-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-navy dark:text-slate-200">AI Summary</h2>
        <AILabel />
      </div>

      <div className="space-y-4">
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">1-Line</h3>
          <div className="break-words text-sm font-medium leading-snug text-navy dark:text-slate-100">
            <MarkdownContent>{analysis.oneLine}</MarkdownContent>
          </div>
        </section>
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Summary</h3>
          <MarkdownContent className="break-words">{analysis.summary}</MarkdownContent>
        </section>
        {analysis.analyzedAt && (
          <p className="text-xs text-[var(--text-muted)]">
            Analysed {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
