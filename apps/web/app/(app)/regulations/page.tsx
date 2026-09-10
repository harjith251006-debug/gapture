import { RegulationsList } from "@/components/RegulationsList";

export const dynamic = "force-dynamic";

export default function RegulationsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Regulatory documents</h1>
        <p className="text-sm text-slate-500">
          RBI and SEBI publications the platform is monitoring. Open one to see how it compares
          against your organization&apos;s policies.
        </p>
      </div>
      <RegulationsList />
    </div>
  );
}
