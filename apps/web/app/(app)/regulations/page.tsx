import { RegulationsList } from "@/components/RegulationsList";

export const dynamic = "force-dynamic";

export default function RegulationsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="page-title">Regulatory Intelligence</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Track and view the latest regulatory information from RBI and SEBI. Open one to see how it
          compares against your organization&apos;s policies.
        </p>
      </div>
      <RegulationsList />
    </div>
  );
}
