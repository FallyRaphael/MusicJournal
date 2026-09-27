import type { Feel, Id, Piece, PieceStatus, ShelveOutcome, StatusChange, Timestamp } from './model';
import { matchScore, tokenize } from './search';

/* ---------- Status ---------- */

export type PieceTab = 'active' | 'upNext' | 'shelf';

export function tabOf(status: PieceStatus): PieceTab {
  if (status === 'upNext') return 'upNext';
  if (status === 'shelved') return 'shelf';
  return 'active';
}

/**
 * The status fields after changing a piece's status. Changing to the current status is a
 * no-op, except that a shelved piece's outcome can be corrected without a new period.
 */
export function withStatusChange(
  piece: Pick<Piece, 'status' | 'statusHistory'>,
  status: PieceStatus,
  at: Timestamp,
  outcome?: ShelveOutcome,
): Pick<Piece, 'status' | 'statusHistory'> {
  const history = piece.statusHistory;
  const last = history[history.length - 1];
  const change: StatusChange =
    status === 'shelved' && outcome ? { status, at, outcome } : { status, at };

  if (last && last.status === status) {
    if (status !== 'shelved' || last.outcome === outcome) return piece;
    const corrected: StatusChange = outcome ? { ...last, outcome } : { status, at: last.at };
    return { status, statusHistory: [...history.slice(0, -1), corrected] };
  }
  return { status, statusHistory: [...history, change] };
}

export interface StatusPeriod {
  status: PieceStatus;
  outcome?: ShelveOutcome;
  from: Timestamp;
  /** Null for the current period. */
  to: Timestamp | null;
}

/** The status history as consecutive periods, oldest first. */
export function statusPeriods(history: readonly StatusChange[]): StatusPeriod[] {
  return history.map((change, i) => ({
    status: change.status,
    ...(change.outcome ? { outcome: change.outcome } : {}),
    from: change.at,
    to: history[i + 1]?.at ?? null,
  }));
}

/** When the current status began. */
export function currentStatusSince(piece: Pick<Piece, 'statusHistory'>): Timestamp | undefined {
  return piece.statusHistory[piece.statusHistory.length - 1]?.at;
}

/* ---------- Tags ---------- */

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ');
}

/** Adds a tag unless it is empty or already present (ignoring case). */
export function addTag(tags: readonly string[], tag: string): string[] {
  const clean = normalizeTag(tag);
  if (!clean || tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return [...tags];
  return [...tags, clean];
}

/** All tags used across pieces, without case duplicates, alphabetically. */
export function collectTags(pieces: readonly Pick<Piece, 'tags'>[]): string[] {
  const byKey = new Map<string, string>();
  for (const piece of pieces) {
    for (const tag of piece.tags) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/* ---------- Filtering & sorting ---------- */

export type FeelFilter = Feel | 'unrated';

export interface PieceFilter {
  tab: PieceTab;
  query: string;
  /** Empty means "any". */
  feels: readonly FeelFilter[];
  /** Pieces with at least one of these tags. Empty means "any". */
  tags: readonly string[];
}

export function filterPieces(pieces: readonly Piece[], filter: PieceFilter): Piece[] {
  const queryTokens = tokenize(filter.query);
  const wantedTags = filter.tags.map((t) => t.toLowerCase());
  return pieces.filter((piece) => {
    if (tabOf(piece.status) !== filter.tab) return false;
    if (filter.feels.length > 0 && !filter.feels.includes(piece.feel ?? 'unrated')) return false;
    if (wantedTags.length > 0 && !piece.tags.some((t) => wantedTags.includes(t.toLowerCase()))) {
      return false;
    }
    if (queryTokens.length > 0) {
      const words = tokenize(
        [piece.title, piece.composer, piece.catalogNumber ?? '', ...piece.tags].join(' '),
      );
      if (matchScore(queryTokens, words) === 0) return false;
    }
    return true;
  });
}

export type PieceSort = 'recent' | 'title' | 'composer' | 'target';

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/**
 * Sorts pieces. "recent" = most recently practiced first (pieces never practiced follow,
 * newest first); "target" = earliest target date first, pieces without one last.
 */
export function sortPieces(
  pieces: readonly Piece[],
  sort: PieceSort,
  lastPracticed: ReadonlyMap<Id, Timestamp>,
): Piece[] {
  const sorted = [...pieces];
  switch (sort) {
    case 'recent':
      return sorted.sort(
        (a, b) =>
          (lastPracticed.get(b.id) ?? 0) - (lastPracticed.get(a.id) ?? 0) ||
          b.createdAt - a.createdAt,
      );
    case 'title':
      return sorted.sort((a, b) => byText(a.title, b.title));
    case 'composer':
      return sorted.sort((a, b) => byText(a.composer, b.composer) || byText(a.title, b.title));
    case 'target':
      return sorted.sort((a, b) => {
        if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return byText(a.title, b.title);
      });
  }
}
