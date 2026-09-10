import { NotificationList } from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="page-title">Alerts</h1>
        <p className="text-sm text-[var(--text-muted)]">
          One alert per regulatory change analysed against your organization&apos;s policies. Tap to
          see the summary and open the full analysis.
        </p>
      </div>
      <NotificationList />
    </div>
  );
}
