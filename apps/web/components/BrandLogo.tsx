import Image from "next/image";
import Link from "next/link";

/**
 * Canonical Gapture AI brand mark (DESIGN.md §3.3, §45).
 *
 *  - `wordmark` (default): crisp text lockup — "Gapture" in navy + "AI" in the
 *    teal→green brand gradient + the AI sparkle. Used in the app header and on
 *    mobile. Themeable, sharp at any size.
 *  - `full`: the supplied logo image (with the "Gaps, Captured." tagline).
 *    Used on the login/brand panel.
 *
 * Never recolour or distort the supplied asset.
 */
export function BrandLogo({
  variant = "wordmark",
  tone = "auto",
  href = "/dashboard",
  className = "",
}: {
  variant?: "wordmark" | "full";
  /** "onDark" forces the light treatment for use on the brand gradient. */
  tone?: "auto" | "onDark";
  href?: string | null;
  className?: string;
}) {
  const inner =
    variant === "full" ? (
      <Image
        src="/gapture-logo.png"
        alt="Gapture AI — Gaps, Captured"
        width={2011}
        height={820}
        priority
        className="h-auto w-full max-w-[280px]"
      />
    ) : (
      <span className={`inline-flex items-baseline gap-[0.5px] text-lg font-bold tracking-tight ${className}`}>
        <span className={tone === "onDark" ? "text-white" : "text-navy dark:text-white"}>Gapture</span>
        {tone === "onDark" ? (
          <span className="text-teal">AI</span>
        ) : (
          <span className="bg-gradient-to-r from-teal to-[#0b6bff] bg-clip-text text-transparent">AI</span>
        )}
        <span className="ml-0.5 text-teal" aria-hidden>
          ✦
        </span>
      </span>
    );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="Gapture AI" className="inline-flex items-center">
      {inner}
    </Link>
  );
}
