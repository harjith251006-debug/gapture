import { createClient } from "@/lib/supabase/server";
import { PolicyUpload } from "@/components/PolicyUpload";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded — queued",
  CLEANING: "Extracting & cleaning",
  INDEXING: "Embedding",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

export default async function PoliciesPage() {
  const supabase = await createClient();
  const { data: policies } = await supabase
    .from("compliance_policies")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Compliance policies</h1>
        <p className="text-sm text-slate-500">
          Upload your organization&apos;s compliance policies. Each is cleaned, chunked, and
          embedded so new regulatory changes can be compared against them.
        </p>
      </div>

      <PolicyUpload />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Uploaded ({policies?.length ?? 0})</h2>
        {!policies || policies.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800">
            {policies.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 break-words">{p.title}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
