import Parser from "rss-parser";
import type { RawFeedItem } from "./types.js";

const parser = new Parser({
  timeout: 30_000,
  headers: {
    // RBI/SEBI block obviously-scripted requests without a UA string.
    "User-Agent": "GaptureMonitor/1.0 (+regulatory compliance monitoring)",
  },
});

export class SourceUnavailableError extends Error {
  constructor(
    public readonly url: string,
    cause: unknown,
  ) {
    super(`Source feed unavailable: ${url}`);
    this.name = "SourceUnavailableError";
    this.cause = cause;
  }
}

/**
 * Fetch and parse an RSS feed into raw items. Throws SourceUnavailableError
 * on any network/parse failure so the loop can log-and-continue (HLSA §21) —
 * a single bad poll must never crash the worker.
 */
export async function fetchFeed(url: string, timeoutMs: number): Promise<RawFeedItem[]> {
  let feed: Awaited<ReturnType<typeof parser.parseURL>>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "GaptureMonitor/1.0 (+regulatory compliance monitoring)" },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const xml = await res.text();
      feed = await parser.parseString(xml);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    throw new SourceUnavailableError(url, err);
  }

  return feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.content ?? (item as { "content:encoded"?: string })["content:encoded"],
    contentSnippet: item.contentSnippet,
  }));
}
