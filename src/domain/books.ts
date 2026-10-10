/** Numbered books: where you are, derived from the exercise ranges you logged. */

import type { Book, Id, ItemRef, PracticeEntry, Session } from './model';
import { sameRef } from './refs';

export interface BookProgress {
  /** The highest exercise number logged so far. */
  last?: number;
  /** Where to continue. */
  next: number;
}

/**
 * How far a book got, from the logged ranges. (Entries count even in a session whose timer
 * never ran: logging is practice too.)
 */
export function bookProgress(bookId: Id, sessions: readonly Session[]): BookProgress {
  let last: number | undefined;
  for (const session of sessions) {
    for (const section of session.sections) {
      for (const item of section.items) {
        if (item.ref.kind !== 'book' || item.ref.bookId !== bookId) continue;
        for (const entry of item.entries) {
          const end = entry.to ?? entry.from;
          if (end !== undefined && (last === undefined || end > last)) last = end;
        }
      }
    }
  }
  return { last, next: (last ?? 0) + 1 };
}

/** "44 of 500 done", "Up to No. 44" or "Not started" */
export function bookProgressText(
  book: Pick<Book, 'id' | 'total'>,
  sessions: readonly Session[],
): string {
  const { last } = bookProgress(book.id, sessions);
  if (last === undefined) {
    return book.total ? `Not started · ${book.total} exercises` : 'Not started';
  }
  return book.total ? `${last} of ${book.total} done` : `Up to No. ${last}`;
}

/** "No. 45" or "No. 45–48" */
export function formatRange(entry: Pick<PracticeEntry, 'from' | 'to'>): string {
  if (entry.from === undefined) return '';
  return entry.to === undefined || entry.to === entry.from
    ? `No. ${entry.from}`
    : `No. ${entry.from}–${entry.to}`;
}

interface HasSections {
  sections: { items: { ref: ItemRef }[] }[];
}

/** One-off labels used in sessions or templates, most used first. */
export function oneOffLabels(records: readonly HasSections[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const section of record.sections) {
      for (const { ref } of section.items) {
        if (ref.kind === 'free') counts.set(ref.label, (counts.get(ref.label) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Replaces a one-off with a book in a session's or template's sections. Returns null when
 * the label isn't used, so unchanged records can be left alone.
 */
export function replaceOneOff<T extends HasSections>(
  record: T,
  label: string,
  bookId: Id,
): T['sections'] | null {
  const oneOff: ItemRef = { kind: 'free', label };
  if (!record.sections.some((s) => s.items.some((item) => sameRef(item.ref, oneOff)))) return null;
  return record.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      sameRef(item.ref, oneOff) ? { ...item, ref: { kind: 'book', bookId } } : item,
    ),
  }));
}
