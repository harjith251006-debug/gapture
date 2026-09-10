/**
 * Text extraction and primary-file discovery for retrieved regulatory pages.
 *
 * Both RBI and SEBI publish an HTML landing page plus (usually) a PDF:
 *   - RBI  page: full circular text is inline in a `tablecontent2` row, and
 *                a PDF lives at rbidocs.rbi.org.in/.../PDFs/NT<n>....PDF
 *   - SEBI page: thin — title + nav only; the real document is a PDF at
 *                www.sebi.gov.in/sebi_data/attachdocs/.../<n>.pdf
 *
 * Strategy: if the page yields enough machine-readable text, use it directly
 * and skip OCR (OCR on already-digital text is wasteful and lower quality).
 * Otherwise OCR the PDF.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": " ", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”",
  "&ndash;": "–", "&mdash;": "—", "&hellip;": "…",
};

export function htmlToText(html: string): string {
  let text = html
    .replace(/<(script|style|noscript|nav|header|footer|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  for (const [entity, char] of Object.entries(ENTITIES)) text = text.split(entity).join(char);
  text = text.replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** RBI: slice the circular body out of the nav-heavy page. */
function rbiMainHtml(html: string): string {
  const marker = html.search(/class="tableheader"/i);
  if (marker < 0) return html;
  // Start after the header cell's closing tag so the literal `tableheader`
  // and the "(NNN kb)" PDF-size marker don't leak into the text.
  const afterHeader = html.indexOf("</td>", marker);
  const start = afterHeader > 0 ? afterHeader + 5 : marker;
  const rest = html.slice(start);
  const endMarkers = [
    /Was this page helpful/i,
    /id="RelatedLink"/i,
    /class="pageheadscroll"/i,
    /Server \d{3}/i,
    /id="divFooter"/i,
  ];
  let end = rest.length;
  for (const re of endMarkers) {
    const m = rest.search(re);
    if (m > 0 && m < end) end = m;
  }
  return rest.slice(0, end);
}

/** SEBI: the article/content region, if any real text is there. */
function sebiMainHtml(html: string): string {
  const m = html.match(/content-box clearfix"[\s\S]*?(?=<footer|<script|<\/body|id="RelatedLink)/i);
  return m ? m[0] : "";
}

export function extractPageText(html: string, sourceCode: string): string {
  if (sourceCode === "RBI") return htmlToText(rbiMainHtml(html));
  if (sourceCode === "SEBI") return htmlToText(sebiMainHtml(html));
  return htmlToText(html);
}

function absolutize(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/**
 * Find the primary downloadable document (PDF). Both regulators reference the
 * PDF in different ways, so this scans the raw HTML per source:
 *   RBI  — an `<a href>` to rbidocs.rbi.org.in/rdocs/notification/PDFs/NT<n>....PDF
 *          (the accessibility/Utkarsh chrome PDFs are on every page — excluded)
 *   SEBI — an `<iframe src='.../web/?file=<PDF>'>` pointing at
 *          www.sebi.gov.in/sebi_data/attachdocs/<month>/<n>.pdf
 */
export function findPrimaryPdfUrl(
  html: string,
  pageUrl: string,
  sourceCode: string,
): string | null {
  if (sourceCode === "RBI") {
    const m = html.match(
      /https?:\/\/rbidocs\.rbi\.org\.in\/rdocs\/notification\/PDFs\/[^"'\s<>]+\.pdf/i,
    );
    return m ? m[0] : null;
  }

  if (sourceCode === "SEBI") {
    const m = html.match(/sebi_data\/attachdocs\/[^"'\s?&<>]+\.pdf/i);
    return m ? `https://www.sebi.gov.in/${m[0]}` : null;
  }

  const any = [...html.matchAll(/(?:href|src)\s*=\s*["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi)][0]?.[1];
  return any ? absolutize(any, pageUrl) : null;
}

/** Below this many characters, page text is treated as insufficient → OCR the PDF. */
export const MIN_USABLE_PAGE_TEXT = 400;
