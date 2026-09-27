/**
 * Lightweight text search: accent- and case-insensitive, word-prefix based.
 * "dvorak humor" finds "Antonín Dvořák – Humoresque"; "op 9 2" finds "Op. 9 No. 2".
 */

const SYNONYMS: Record<string, string> = {
  opus: 'op',
  nr: 'no',
  number: 'no',
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized.split(' ').map((word) => SYNONYMS[word] ?? word);
}

/**
 * How well `queryTokens` match `words`: every query token must match some word
 * (exactly: 3 points, as a prefix: 2, inside a longer word: 1). Returns 0 if any
 * token doesn't match at all.
 */
export function matchScore(queryTokens: readonly string[], words: readonly string[]): number {
  let total = 0;
  for (const token of queryTokens) {
    let best = 0;
    for (const word of words) {
      if (word === token) {
        best = 3;
        break;
      }
      if (word.startsWith(token)) best = Math.max(best, 2);
      else if (token.length >= 3 && word.includes(token)) best = Math.max(best, 1);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
