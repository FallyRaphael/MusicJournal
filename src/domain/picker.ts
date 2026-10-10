/** What the "Add to section" picker suggests, learned from earlier sessions. */

import type { Id, ItemRef, Session } from './model';
import { sessionTime } from './pieceStats';
import { refKey } from './refs';
import { matchScore, tokenize } from './search';

export type PickKind = ItemRef['kind'];

/** Sessions newest first. */
const newestFirst = (sessions: readonly Session[]) =>
  [...sessions].sort((a, b) => sessionTime(b) - sessionTime(a));

/** The distinct items used in a section, most recently used first. */
export function recentInSection(
  sessions: readonly Session[],
  sectionTypeId: Id,
  limit = 8,
): ItemRef[] {
  const seen = new Set<string>();
  const refs: ItemRef[] = [];
  for (const session of newestFirst(sessions)) {
    for (const section of session.sections) {
      if (section.sectionTypeId !== sectionTypeId) continue;
      for (const item of section.items) {
        const key = refKey(item.ref);
        if (seen.has(key)) continue;
        seen.add(key);
        refs.push(item.ref);
        if (refs.length === limit) return refs;
      }
    }
  }
  return refs;
}

/**
 * The kind of item a section usually holds: the most common kind in its recent items,
 * or a guess from its name when it has never been used.
 */
export function sectionKind(
  sessions: readonly Session[],
  sectionTypeId: Id,
  sectionName: string,
): PickKind {
  const counts = new Map<PickKind, number>();
  for (const ref of recentInSection(sessions, sectionTypeId, 20)) {
    counts.set(ref.kind, (counts.get(ref.kind) ?? 0) + 1);
  }
  const [mostCommon] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (mostCommon) return mostCommon;
  if (/repertoire|piece/i.test(sectionName)) return 'piece';
  if (/technique|warm/i.test(sectionName)) return 'technique';
  if (/sight|étude|etude|book/i.test(sectionName)) return 'book';
  return 'free';
}

/** Whether `text` matches a search query (all words, in any order). */
export function matchesQuery(query: string, text: string): boolean {
  const tokens = tokenize(query);
  return tokens.length === 0 || matchScore(tokens, tokenize(text)) > 0;
}
