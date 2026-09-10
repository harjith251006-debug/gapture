/**
 * RBI and SEBI both publish India-time dates in non-standard, inconsistent
 * formats and frequently omit the timezone:
 *   RBI:  "Tue, 08 Sep 2026 18:25:00"      (RFC-822-ish, no TZ)
 *   SEBI: "10 Sep, 2026 +0530"              (day-first, comma after month)
 *
 * Strategy: try native Date parsing first (handles the RFC-822 case), and if
 * that yields no timezone or fails, normalise and assume IST (+05:30), since
 * both regulators are Indian. Returns null rather than an invalid Date so the
 * caller stores NULL (published_at is nullable — DB Schema §13).
 */
export function parseIndiaDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Direct parse — works for RBI's "Tue, 08 Sep 2026 18:25:00" and anything
  // already carrying an explicit offset.
  const hasExplicitTz = /(?:GMT|UTC|[+-]\d{2}:?\d{2}|Z)\s*$/i.test(trimmed);
  const direct = new Date(hasExplicitTz ? trimmed : `${trimmed} +0530`);
  if (!Number.isNaN(direct.getTime())) return direct;

  // SEBI's "10 Sep, 2026 +0530" — strip the comma and retry.
  const decommaed = new Date(trimmed.replace(/,/g, ""));
  if (!Number.isNaN(decommaed.getTime())) return decommaed;

  const decommaedIst = new Date(`${trimmed.replace(/[+-]\d{4}\s*$/, "").replace(/,/g, "").trim()} +0530`);
  if (!Number.isNaN(decommaedIst.getTime())) return decommaedIst;

  return null;
}
