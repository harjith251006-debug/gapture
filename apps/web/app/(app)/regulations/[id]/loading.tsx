export default function Loading() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-24 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
