import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-slate-500">
        That page or document doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
