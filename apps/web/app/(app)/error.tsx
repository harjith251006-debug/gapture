"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-md space-y-3 p-6">
      <h1 className="section-title">Unable to load this page</h1>
      <p className="text-sm text-[var(--text-muted)]">
        We couldn&apos;t retrieve the information right now. It&apos;s not you.
      </p>
      <button type="button" onClick={reset} className="btn-secondary !py-1.5">
        Try again
      </button>
    </div>
  );
}
