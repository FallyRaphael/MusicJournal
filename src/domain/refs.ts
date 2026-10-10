import type { ItemRef } from './model';

/** Whether two references point to the same piece, technique item, book or free-text label. */
export function sameRef(a: ItemRef, b: ItemRef): boolean {
  return refKey(a) === refKey(b);
}

/** A stable string key for a reference, e.g. for grouping or React keys. */
export function refKey(ref: ItemRef): string {
  if (ref.kind === 'piece') return `piece:${ref.pieceId}`;
  if (ref.kind === 'technique') return `technique:${ref.techniqueId}`;
  if (ref.kind === 'book') return `book:${ref.bookId}`;
  return `free:${ref.label}`;
}
