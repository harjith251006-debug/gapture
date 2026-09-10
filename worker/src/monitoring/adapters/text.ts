/**
 * SEBI occasionally puts HTML (an `<a href>` "[FAQ]" link) directly inside
 * the `<title>` element. Titles must be plain text — strip tags, decode the
 * handful of entities that actually appear, and collapse whitespace.
 */
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ndash;": "–",
  "&mdash;": "—",
};

export function cleanTitle(raw: string): string {
  let text = raw.replace(/<[^>]*>/g, " ");
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    text = text.split(entity).join(char);
  }
  text = text.replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)));
  return text.replace(/\s+/g, " ").trim();
}
