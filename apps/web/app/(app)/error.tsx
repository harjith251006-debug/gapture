"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-500">This page failed to load. It&apos;s not you.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        Try again
      </button>
    </div>
  );
}
