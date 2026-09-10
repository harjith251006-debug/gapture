/**
 * One raw entry from a source feed, before any source-specific interpretation.
 */
export interface RawFeedItem {
  title?: string;
  link?: string;
  /** Raw date string as it appeared in the feed (formats vary by source). */
  pubDate?: string;
  /** Full item content/description (may be large HTML, e.g. RBI). */
  content?: string;
  contentSnippet?: string;
}

/**
 * A source-interpreted candidate — enough to record a `regulatory_documents`
 * row at status DETECTED. The pipeline after this (retrieval, OCR, …) is
 * Phase 5's concern.
 */
export interface CandidateItem {
  /** Stable, source-provided identifier — the idempotency key (DB Schema §32). */
  externalReference: string;
  title: string;
  /** Canonical human-facing URL for this notification. */
  sourceUrl: string;
  /** Direct link to a downloadable file (PDF), if the feed exposes one. */
  fileUrl?: string;
  /** Parsed publication timestamp, or null if unparseable. */
  publishedAt: Date | null;
}

export interface SourceAdapter {
  /** Matches `regulatory_sources.code` (e.g. "RBI", "SEBI"). */
  readonly code: string;
  /**
   * Turn raw feed items into source-interpreted candidates. Items that can't
   * be interpreted (no usable identifier/title) are dropped here and the
   * caller is told via the return shape.
   */
  toCandidates(items: RawFeedItem[]): { candidates: CandidateItem[]; dropped: number };
}
