import { fromDateKey } from './dates';
import type { Id, ItemRef, Session, Timestamp } from './model';
import type { StatusPeriod } from './pieces';
import { itemSeconds } from './timer';

/** When a session happened: its start, or the start of its day if it never ran. */
export function sessionTime(session: Pick<Session, 'startedAt' | 'date'>): Timestamp {
  return session.startedAt ?? fromDateKey(session.date).getTime();
}

/** Planned sessions haven't happened yet and don't count. */
const practiced = (session: Session) => session.status !== 'planned';

export interface PieceSessionSummary {
  sessionId: Id;
  at: Timestamp;
  /** Time spent on the piece in that session. */
  seconds: number;
}

/** Tells whether a session item is about a particular piece or technique item. */
export type RefMatcher = (ref: ItemRef) => boolean;

export const isPiece =
  (pieceId: Id): RefMatcher =>
  (ref) =>
    ref.kind === 'piece' && ref.pieceId === pieceId;

export const isTechnique =
  (techniqueId: Id): RefMatcher =>
  (ref) =>
    ref.kind === 'technique' && ref.techniqueId === techniqueId;

export const isBook =
  (bookId: Id): RefMatcher =>
  (ref) =>
    ref.kind === 'book' && ref.bookId === bookId;

/** The practiced sessions with matching items, newest first. */
export function sessionSummaries(
  matches: RefMatcher,
  sessions: readonly Session[],
  now: Timestamp,
): PieceSessionSummary[] {
  const summaries: PieceSessionSummary[] = [];
  for (const session of sessions) {
    if (!practiced(session)) continue;
    const items = session.sections
      .flatMap((section) => section.items)
      .filter((item) => matches(item.ref));
    if (items.length === 0) continue;
    summaries.push({
      sessionId: session.id,
      at: sessionTime(session),
      seconds: items.reduce((sum, item) => sum + itemSeconds(item, now), 0),
    });
  }
  return summaries.sort((a, b) => b.at - a.at);
}

/** The practiced sessions that include the piece, newest first. */
export function pieceSessionSummaries(
  pieceId: Id,
  sessions: readonly Session[],
  now: Timestamp,
): PieceSessionSummary[] {
  return sessionSummaries(isPiece(pieceId), sessions, now);
}

/** The most recently logged BPM for matching items, across all given sessions. */
export function lastBpm(matches: RefMatcher, sessions: readonly Session[]): number | undefined {
  let latest: { at: Timestamp; bpm: number } | undefined;
  for (const session of sessions) {
    for (const section of session.sections) {
      for (const item of section.items) {
        if (!matches(item.ref)) continue;
        for (const entry of item.entries) {
          if (entry.bpm !== undefined && (!latest || entry.at > latest.at)) {
            latest = { at: entry.at, bpm: entry.bpm };
          }
        }
      }
    }
  }
  return latest?.bpm;
}

export interface PieceStats {
  totalSeconds: number;
  sessionCount: number;
  lastPracticedAt?: Timestamp;
  /** Seconds practiced during each status period, aligned with the given periods. */
  periodSeconds: number[];
}

export function pieceStats(
  pieceId: Id,
  sessions: readonly Session[],
  periods: readonly StatusPeriod[],
  now: Timestamp,
): PieceStats {
  const summaries = pieceSessionSummaries(pieceId, sessions, now);
  const periodSeconds = periods.map(() => 0);
  for (const { at, seconds } of summaries) {
    const index = periods.findIndex((p) => at >= p.from && (p.to === null || at < p.to));
    // Sessions from before the first period (e.g. from an imported backup) count to the first.
    if (periods.length > 0) periodSeconds[index === -1 ? 0 : index] += seconds;
  }
  return {
    totalSeconds: summaries.reduce((sum, s) => sum + s.seconds, 0),
    sessionCount: summaries.length,
    lastPracticedAt: summaries[0]?.at,
    periodSeconds,
  };
}

/** For each piece, when it was last practiced. */
export function lastPracticedByPiece(sessions: readonly Session[]): Map<Id, Timestamp> {
  const result = new Map<Id, Timestamp>();
  for (const session of sessions) {
    if (!practiced(session)) continue;
    const at = sessionTime(session);
    for (const pieceId of session.pieceIds) {
      if (at > (result.get(pieceId) ?? 0)) result.set(pieceId, at);
    }
  }
  return result;
}
