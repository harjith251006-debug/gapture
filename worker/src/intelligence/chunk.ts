/**
 * Chunking (PRD FR-10, Tech Stack section 15).
 *
 * Splits cleaned document text into retrieval-sized segments, preferring
 * natural boundaries (paragraph -> sentence -> hard cut, in that order) over
 * blind character slicing. Each returned chunk carries a small overlap with
 * the previous one so a clause that straddles a boundary is still fully
 * present in at least one chunk.
 *
 * Sizes are in characters (not tokens): a deliberately conservative proxy so
 * a chunk always fits comfortably inside any embedding model's context
 * window. ~1 token ≈ 4 chars, so MAX_CHUNK_CHARS 2000 ≈ 500 tokens.
 */

export const TARGET_CHUNK_CHARS = 1400;
export const MAX_CHUNK_CHARS = 2000;
/** A trailing chunk shorter than this is merged back into the previous one. */
export const MIN_CHUNK_CHARS = 250;
/** Characters of the previous chunk's tail to prepend to the next chunk. */
export const OVERLAP_CHARS = 150;
/**
 * The most *new* content one chunk may carry. A flushed chunk is seeded with
 * up to OVERLAP_CHARS of the previous chunk plus one unit, so bounding a unit
 * here keeps the final chunk (overlap + separator + unit) within
 * MAX_CHUNK_CHARS.
 */
const BODY_MAX_CHARS = MAX_CHUNK_CHARS - OVERLAP_CHARS - 2;

/** Split a paragraph that is itself larger than BODY_MAX_CHARS. */
function splitOversizedParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [
    paragraph,
  ];

  const pieces: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    if (sentence.length > BODY_MAX_CHARS) {
      if (buf) {
        pieces.push(buf);
        buf = "";
      }
      for (let i = 0; i < sentence.length; i += BODY_MAX_CHARS) {
        pieces.push(sentence.slice(i, i + BODY_MAX_CHARS));
      }
      continue;
    }
    if (buf && buf.length + 1 + sentence.length > BODY_MAX_CHARS) {
      pieces.push(buf);
      buf = sentence;
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

/** Tail of `text`, trimmed to a word boundary, at most OVERLAP_CHARS long. */
function overlapTail(text: string): string {
  if (text.length <= OVERLAP_CHARS) return text;
  const tail = text.slice(text.length - OVERLAP_CHARS);
  const firstSpace = tail.indexOf(" ");
  return firstSpace > 0 ? tail.slice(firstSpace + 1) : tail;
}

/**
 * Chunk cleaned text. Returns [] for empty/whitespace input. Chunk order is
 * the returned array order; the caller assigns `chunk_index` by position.
 */
export function chunkText(cleaned: string): string[] {
  const text = cleaned.trim();
  if (!text) return [];

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  // Flatten to units no larger than MAX_CHUNK_CHARS.
  const units: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length > BODY_MAX_CHARS) units.push(...splitOversizedParagraph(paragraph));
    else units.push(paragraph);
  }

  // Greedily pack units into chunks up to TARGET_CHUNK_CHARS.
  const chunks: string[] = [];
  let buf = "";
  for (const unit of units) {
    if (!buf) {
      buf = unit;
      continue;
    }
    if (buf.length + 2 + unit.length <= TARGET_CHUNK_CHARS) {
      buf = `${buf}\n\n${unit}`;
    } else {
      chunks.push(buf);
      const carry = overlapTail(buf);
      buf = carry ? `${carry}\n\n${unit}` : unit;
    }
  }
  if (buf) {
    if (chunks.length > 0 && buf.length < MIN_CHUNK_CHARS) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n\n${buf}`;
    } else {
      chunks.push(buf);
    }
  }

  return chunks;
}
