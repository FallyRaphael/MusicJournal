/** Passages of a piece: labels, order, and the tempo and use history of each. */

import type { Id, Passage, PracticeEntry, Session, Timestamp } from './model';

/** The passage's name, or its bars when it has no name. */
export function passageLabel(passage: Pick<Passage, 'name' | 'fromBar' | 'toBar'>): string {
  return passage.name.trim() || barsLabel(passage) || 'Passage';
}

/** "Bars 13–16", "Bar 5", "From bar 40" – or '' without bars. */
export function barsLabel(passage: Pick<Passage, 'fromBar' | 'toBar'>): string {
  const { fromBar, toBar } = passage;
  if (fromBar === undefined) return toBar === undefined ? '' : `Up to bar ${toBar}`;
  if (toBar === undefined) return `From bar ${fromBar}`;
  return fromBar === toBar ? `Bar ${fromBar}` : `Bars ${fromBar}–${toBar}`;
}

/** In order through the piece: by first bar (passages without bars last), then by age. */
export function sortPassages(passages: readonly Passage[]): Passage[] {
  return [...passages].sort(
    (a, b) =>
      (a.fromBar ?? Number.MAX_SAFE_INTEGER) - (b.fromBar ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt - b.createdAt,
  );
}

/** Which entries count for a passage; `null` means the whole piece. */
export type PassageFilter = Id | null;

/**
 * Whether an entry belongs to the passage. Whole-piece entries are those without a passage,
 * or with one that no longer exists.
 */
export function entryMatches(
  entry: Pick<PracticeEntry, 'passageId'>,
  passage: PassageFilter,
  known: ReadonlySet<Id>,
): boolean {
  if (passage === null) return entry.passageId === undefined || !known.has(entry.passageId);
  return entry.passageId === passage;
}

/** All entries logged for a piece, with when they happened. */
function pieceEntries(pieceId: Id, sessions: readonly Session[]): PracticeEntry[] {
  return sessions.flatMap((session) =>
    session.sections.flatMap((section) =>
      section.items
        .filter((item) => item.ref.kind === 'piece' && item.ref.pieceId === pieceId)
        .flatMap((item) => item.entries),
    ),
  );
}

export interface PassageTempo {
  /** The most recently logged tempo. */
  last?: number;
  best?: number;
  lastAt?: Timestamp;
}

/** The last and best tempo logged for a passage (or the whole piece). */
export function passageTempo(
  pieceId: Id,
  passage: PassageFilter,
  known: ReadonlySet<Id>,
  sessions: readonly Session[],
): PassageTempo {
  const result: PassageTempo = {};
  for (const entry of pieceEntries(pieceId, sessions)) {
    if (entry.bpm === undefined || !entryMatches(entry, passage, known)) continue;
    if (result.lastAt === undefined || entry.at > result.lastAt) {
      result.last = entry.bpm;
      result.lastAt = entry.at;
    }
    if (result.best === undefined || entry.bpm > result.best) result.best = entry.bpm;
  }
  return result;
}

/**
 * The passage worked on most recently (from the last entry for the piece): where the next
 * session most likely continues. `null` for the whole piece, undefined if nothing was logged.
 */
export function lastPassage(
  pieceId: Id,
  known: ReadonlySet<Id>,
  sessions: readonly Session[],
): PassageFilter | undefined {
  let latest: PracticeEntry | undefined;
  for (const entry of pieceEntries(pieceId, sessions)) {
    if (!latest || entry.at > latest.at) latest = entry;
  }
  if (!latest) return undefined;
  return latest.passageId !== undefined && known.has(latest.passageId) ? latest.passageId : null;
}
