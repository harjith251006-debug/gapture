import type { CandidateItem, RawFeedItem, SourceAdapter } from "../types.js";
import { parseIndiaDate } from "./date.js";
import { cleanTitle } from "./text.js";

/**
 * SEBI feed shape (verified 2026-09-11 against
 * https://www.sebi.gov.in/sebirss.xml):
 *   <item>
 *     <title> ... </title>
 *     <description> ... (same as title) </description>
 *     <link>https://www.sebi.gov.in/.../...-slug-_104423.html</link>
 *     <pubDate>10 Sep, 2026 +0530</pubDate>
 *   </item>
 * No <guid>. The trailing "_<digits>.html" on the link is the stable id.
 */

const SEBI_ID_RE = /_(\d+)\.html?$/i;

function deriveExternalReference(item: RawFeedItem): string | null {
  const fromLink = item.link?.match(SEBI_ID_RE)?.[1];
  if (fromLink) return `SEBI-${fromLink}`;
  return item.link ?? null;
}

export const sebiAdapter: SourceAdapter = {
  code: "SEBI",

  toCandidates(items: RawFeedItem[]) {
    let dropped = 0;
    const candidates: CandidateItem[] = [];

    for (const item of items) {
      const title = item.title ? cleanTitle(item.title) : undefined;
      const externalReference = deriveExternalReference(item);

      if (!title || !externalReference || !item.link) {
        dropped++;
        continue;
      }

      candidates.push({
        externalReference,
        title,
        sourceUrl: item.link,
        // SEBI links point to an HTML landing page; the PDF (if any) is
        // discovered during retrieval (Phase 5), not from the feed.
        fileUrl: undefined,
        publishedAt: parseIndiaDate(item.pubDate),
      });
    }

    return { candidates, dropped };
  },
};
