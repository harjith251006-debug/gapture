/**
 * The 1-Line + Summary outputs (PRD FR-20). `detailed_output` is rendered
 * separately by DetailedBrief. When no analysis exists yet, the caller
 * shows a processing state instead of this component.
 */

export interface AnalysisData {
  oneLine: string;
  detailed: string;
  summary: string;
  analyzedAt: string | null;
}

export function SummaryView({ analysis }: { analysis: AnalysisData }) {
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">1-Line</h2>
        <p className="text-sm font-medium leading-snug">{analysis.oneLine}</p>
      </section>
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Summary</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {analysis.summary}
        </p>
      </section>
      {analysis.analyzedAt && (
        <p className="text-xs text-slate-400">
          Analysed {new Date(analysis.analyzedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
