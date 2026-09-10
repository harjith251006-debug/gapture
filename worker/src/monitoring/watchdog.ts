import type { CandidateItem } from "./types.js";

export interface WatchdogResult {
  /** Candidates that passed all checks, deduped within this poll cycle. */
  accepted: CandidateItem[];
  /** Count removed because a candidate with the same externalReference appeared earlier in the same feed. */
  duplicatesInBatch: number;
}

/**
 * Watchdog Extraction (PRD FR-03). The adapters already turned raw feed
 * entries into interpreted candidates; the watchdog is the last gate before
 * the New File Detector:
 *   - drops within-cycle duplicates (same source can list an item twice)
 *   - keeps only candidates with a non-empty title and externalReference
 *     (the adapters enforce this too — defence in depth)
 *
 * "File found?" (PRD FR-04) is simply `accepted.length > 0`.
 */
export function runWatchdog(candidates: CandidateItem[]): WatchdogResult {
  const seen = new Set<string>();
  const accepted: CandidateItem[] = [];
  let duplicatesInBatch = 0;

  for (const candidate of candidates) {
    if (!candidate.title || !candidate.externalReference) continue;

    if (seen.has(candidate.externalReference)) {
      duplicatesInBatch++;
      continue;
    }
    seen.add(candidate.externalReference);
    accepted.push(candidate);
  }

  return { accepted, duplicatesInBatch };
}
