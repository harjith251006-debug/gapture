import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card max-w-md space-y-3 p-6">
      <h1 className="section-title">Not found</h1>
      <p className="text-sm text-[var(--text-muted)]">
        That page or document doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
