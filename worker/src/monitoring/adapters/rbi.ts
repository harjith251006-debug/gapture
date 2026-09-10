import type { CandidateItem, RawFeedItem, SourceAdapter } from "../types.js";
import { parseIndiaDate } from "./date.js";
import { cleanTitle } from "./text.js";

/**
 * RBI feed shape (verified 2026-09-11 against
 * https://rbi.org.in/notifications_rss.xml):
 *   <item>
 *     <title><![CDATA[ ... ]]></title>
 *     <description><![CDATA[ <full circular HTML, incl. tables & PDF links> ]]></description>
 *     <link>https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=13696&Mode=0</link>
 *     <pubDate>Tue, 08 Sep 2026 18:25:00</pubDate>   (no timezone — RBI is IST)
 *   </item>
 * No <guid>. The `Id=` query param on the link is the stable identifier.
 */

const RBI_ID_RE = /[?&]Id=(\d+)/i;
const RBI_CIRCULAR_REF_RE = /RBI\/\d{4}-\d{2}\/\d+/;
const PDF_LINK_RE = /https?:\/\/[^\s"'<>]+\.pdf/i;

function deriveExternalReference(item: RawFeedItem): string | null {
  const fromLink = item.link?.match(RBI_ID_RE)?.[1];
  if (fromLink) return `RBI-${fromLink}`;

  const fromContent = item.content?.match(RBI_CIRCULAR_REF_RE)?.[0];
  if (fromContent) return fromContent;

  // Last resort: the canonical link URL is itself stable enough.
  return item.link ?? null;
}

export const rbiAdapter: SourceAdapter = {
  code: "RBI",

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
        fileUrl: item.content?.match(PDF_LINK_RE)?.[0],
        publishedAt: parseIndiaDate(item.pubDate),
      });
    }

    return { candidates, dropped };
  },
};
