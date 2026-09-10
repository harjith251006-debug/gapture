import { NotificationList } from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Notifications</h1>
        <p className="text-sm text-slate-500">
          One notification per regulatory change analysed against your organization&apos;s policies.
          Tap to see the summary and open the full analysis.
        </p>
      </div>
      <NotificationList />
    </div>
  );
}
