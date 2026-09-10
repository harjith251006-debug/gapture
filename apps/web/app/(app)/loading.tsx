export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-24 w-full animate-pulse rounded-[var(--radius-card)] bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 w-full animate-pulse rounded-[var(--radius-card)] bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
