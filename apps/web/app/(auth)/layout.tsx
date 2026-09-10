import { BrandLogo } from "@/components/BrandLogo";

/**
 * Auth screens (DESIGN.md §10): two-panel on desktop — a brand-gradient panel
 * with the logo, tagline and three benefits, alongside the form. Single
 * column on mobile.
 */
const BENEFITS = [
  "Continuous RBI & SEBI regulatory monitoring",
  "AI comparison against your own compliance policies",
  "1-Line, Summary and Detailed insight — grounded, not guessed",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="brand-gradient hidden flex-col justify-between p-10 text-white lg:flex">
        <BrandLogo variant="wordmark" tone="onDark" href={null} className="!text-2xl" />
        <div className="space-y-6">
          <div>
            <p className="text-3xl font-bold leading-tight">Gaps, Captured.</p>
            <p className="mt-2 max-w-sm text-white/80">
              Turn regulatory complexity into actionable insights.
            </p>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-white/90">
                <span className="mt-0.5 text-teal" aria-hidden>
                  ✦
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">Gapture AI · Regulatory Compliance Intelligence</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <BrandLogo variant="wordmark" href={null} className="!text-xl" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
