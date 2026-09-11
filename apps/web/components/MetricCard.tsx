import Link from "next/link";

type IconProps = { className?: string };

function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v6h6M8.5 13h7M8.5 17h7" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

const ICONS = { document: DocumentIcon, shield: ShieldIcon, chart: ChartIcon } as const;

/** Clickable summary metric (FT-07 §4.3, §7) — Home dashboard's metric row. */
export function MetricCard({
  label,
  value,
  supportingText,
  href,
  icon = "document",
}: {
  label: string;
  value: number;
  supportingText: string;
  href: string;
  icon?: keyof typeof ICONS;
}) {
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className="card flex items-center gap-3 p-4 transition-colors hover:border-brand/40"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-green-tint)] text-brand dark:bg-brand/15">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-semibold leading-tight text-navy dark:text-slate-100">{value}</span>
        <span className="block truncate text-sm font-medium text-navy dark:text-slate-200">{label}</span>
        <span className="block text-xs text-[var(--text-muted)]">{supportingText}</span>
      </span>
      <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
        →
      </span>
    </Link>
  );
}
