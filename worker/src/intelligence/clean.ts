/**
 * Document Cleaning (PRD FR-10, Tech Stack section 14).
 *
 * Turns raw extracted text (OCR output for SEBI PDFs, HTML-parsed text for RBI
 * circulars) into a normalized form that embeds well, WITHOUT destroying the
 * regulatory structure downstream analysis relies on:
 *   - clause numbering (`12.3(a)`, `(iv)`, `2.1.1`) is left byte-for-byte intact
 *   - headings and paragraph breaks are preserved as blank-line boundaries
 *   - list / numbering line starts are preserved
 *
 * This is a deliberate MVP baseline (the PRD leaves the exact technique
 * unspecified) - conservative removals only, so cleaning can never be the
 * reason a real obligation goes missing. The encrypted original always
 * remains retrievable from Storage regardless (BRD RISK-002 mitigation).
 */

/** Lines that are pure page furniture - dropped entirely. */
const PAGE_FURNITURE = [
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^\d{1,4}$/, // a lone page number on its own line
  /^-\s*\d{1,4}\s*-$/, // "- 4 -"
];

/** A repeated short line seen this many times or more is a running header/footer. */
const RUNNING_HEADER_MIN_REPEATS = 4;
const RUNNING_HEADER_MAX_LEN = 70;

// Invisible / exotic characters that OCR and HTML both leak in. Built from
// code points so no literal invisible byte ever sits in this source file.
const cc = (n: number): string => String.fromCharCode(n);

const ZERO_WIDTH = new RegExp(
  `[${[0xfeff, 0x200b, 0x200c, 0x200d, 0x2060].map(cc).join("")}]`,
  "g",
);
// NBSP, ogham space, en/em/thin/hair spaces, narrow-NBSP, math space,
// ideographic space, and the Unicode line / paragraph separators.
const EXOTIC_SPACE = new RegExp(
  `[${cc(0xa0)}${cc(0x1680)}${cc(0x2000)}-${cc(0x200a)}${cc(0x2028)}${cc(0x2029)}${cc(0x202f)}${cc(0x205f)}${cc(0x3000)}]`,
  "g",
);
// C0 control chars except tab and newline, plus DEL and the C1 range.
const CONTROL_CHARS = new RegExp(
  `[${cc(0)}-${cc(8)}${cc(0x0b)}-${cc(0x1f)}${cc(0x7f)}-${cc(0x9f)}]`,
  "g",
);

function stripInvisibles(text: string): string {
  return text
    .replace(ZERO_WIDTH, "")
    .replace(EXOTIC_SPACE, " ")
    .replace(CONTROL_CHARS, "");
}

/**
 * Rejoin a word broken across a line break by end-of-line hyphenation
 * (`compli-\nance` -> `compliance`). Only fires for lowercase-to-lowercase, so
 * genuine compound terms that happen to wrap (`Non-\nBanking`) keep their
 * hyphen and just lose the newline.
 */
function dehyphenate(text: string): string {
  return text
    .replace(/([a-z])-\n([a-z])/g, "$1$2")
    .replace(/([A-Za-z])-\n([A-Z])/g, "$1-$2");
}

function isRunningHeader(line: string): boolean {
  if (line.length === 0 || line.length > RUNNING_HEADER_MAX_LEN) return false;
  // Header-ish: institutional boilerplate, or all-caps with no sentence punctuation.
  if (
    /reserve bank of india|securities and exchange board|www\.(rbi|sebi)\.|circular\s+no/i.test(line)
  ) {
    return true;
  }
  return line === line.toUpperCase() && !/[.:;]$/.test(line) && /[A-Z]/.test(line);
}

/**
 * Clean raw extracted text. Idempotent: cleaning an already-clean string
 * returns it unchanged (modulo trailing whitespace).
 */
export function cleanDocumentText(raw: string): string {
  if (!raw) return "";

  let text = stripInvisibles(raw).replace(/\r\n?/g, "\n");
  text = dehyphenate(text);

  // Per-line normalization: collapse intra-line whitespace, trim edges.
  let lines = text.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim());

  // Drop pure page furniture.
  lines = lines.filter((line) => !PAGE_FURNITURE.some((re) => re.test(line)));

  // Drop running headers/footers: identical short header-ish lines repeated
  // across many OCR'd pages.
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const noise = new Set<string>();
  for (const [line, n] of counts) {
    if (n >= RUNNING_HEADER_MIN_REPEATS && isRunningHeader(line)) noise.add(line);
  }
  if (noise.size > 0) lines = lines.filter((line) => !noise.has(line));

  // Collapse runs of blank lines to a single paragraph break; drop leading /
  // trailing blanks.
  const out: string[] = [];
  let blankRun = 0;
  for (const line of lines) {
    if (line === "") {
      blankRun++;
      continue;
    }
    if (out.length > 0 && blankRun > 0) out.push("");
    blankRun = 0;
    out.push(line);
  }

  return out.join("\n").trim();
}
