import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI-generated Markdown (the analysis/Q&A prompts are instructed to
 * produce `##` section headings, `**bold**` labels, and `-`/numbered lists —
 * see analysis-prompt.ts / contextual-qa.ts) with the Gapture design system's
 * own tokens, rather than as an unstyled wall of plain text.
 */
export function MarkdownContent({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-sm font-bold uppercase tracking-wide text-navy first:mt-0 dark:text-slate-100">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-sm font-bold uppercase tracking-wide text-navy first:mt-0 dark:text-slate-100">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1 mt-3 text-sm font-semibold text-navy first:mt-0 dark:text-slate-200">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2.5 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-navy dark:text-slate-100">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-2 border-ai/40 pl-3 text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] dark:bg-slate-800">{children}</code>
          ),
          hr: () => <hr className="my-3 border-[var(--border)]" />,
          table: ({ children }) => (
            <div className="mb-2.5 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--border)] pb-1 pr-3 font-semibold text-navy dark:text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b border-[var(--border)] py-1 pr-3 align-top">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
