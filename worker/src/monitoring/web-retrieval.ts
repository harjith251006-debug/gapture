import type { RawFeedItem } from "./types.js";

/**
 * Web Retrieval Module (HLSA Component 5) — the fallback for a source that
 * has no usable RSS feed. Both RBI and SEBI currently publish working RSS
 * feeds (verified 2026-09-11), so this path is NOT exercised today.
 *
 * The MVP deliberately does not ship a crawler (Tech Stack §7: "The MVP
 * should not begin with a sophisticated crawler"). This function exists so
 * the loop has a defined branch when `regulatory_sources.rss_feed_url` is
 * NULL; a real per-source HTML scraper would be implemented here, one small
 * source-specific module at a time, only when a source actually needs it.
 */
export async function retrieveViaWebScrape(sourceCode: string): Promise<RawFeedItem[]> {
  throw new Error(
    `Web-scrape retrieval is not implemented for ${sourceCode}. ` +
      `This source has no rss_feed_url configured and no scraper module exists yet. ` +
      `RBI and SEBI both have working RSS feeds — configure rss_feed_url instead.`,
  );
}
