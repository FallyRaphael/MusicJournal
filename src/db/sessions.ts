import { useLiveQuery } from 'dexie-react-hooks';
import type { DateKey } from '../domain/dates';
import type { Id, ItemRef, Session, SessionSection } from '../domain/model';
import { sessionTime } from '../domain/pieceStats';
import { sameRef } from '../domain/refs';
import { finishSession, sessionIndexes } from '../domain/session';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

export interface NewSession {
  date: DateKey;
  status: 'planned' | 'finished';
  name?: string;
  templateId?: Id;
  sections: SessionSection[];
  note?: string;
}

export async function createSession(fields: NewSession): Promise<Session> {
  const session: Session = newRecord({
    note: '',
    ...fields,
    ...sessionIndexes(fields.sections),
  });
  await db.sessions.add(session);
  return session;
}

/**
 * Applies a change to a session in one transaction and stores the result with fresh
 * search indexes. All timer actions go through here, so every tap is saved immediately.
 */
export async function mutateSession(
  id: Id,
  change: (session: Session) => Session,
): Promise<Session | undefined> {
  return db.transaction('rw', db.sessions, async () => {
    const current = await db.sessions.get(id);
    if (!current) return undefined;
    const next = change(current);
    if (next === current) return current;
    const saved: Session = { ...next, ...sessionIndexes(next.sections), updatedAt: Date.now() };
    await db.sessions.put(saved);
    return saved;
  });
}

export function deleteSession(id: Id): Promise<void> {
  return deleteRecord('sessions', id);
}

export interface FocusUpdate {
  ref: ItemRef;
  focusNote: string;
}

/**
 * Finishes a session and carries its "focus next time" notes over: each note is stored
 * on the session items and becomes the current focus note of the piece or technique item.
 */
export async function completeSession(
  id: Id,
  focusUpdates: readonly FocusUpdate[],
  note: string,
): Promise<void> {
  await db.transaction('rw', db.sessions, db.pieces, db.techniqueItems, async () => {
    const session = await db.sessions.get(id);
    if (!session) return;
    const now = Date.now();
    const finished = finishSession(session, now);
    const sections = finished.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        const update = focusUpdates.find((u) => sameRef(u.ref, item.ref));
        return update ? { ...item, focusNext: update.focusNote } : item;
      }),
    }));
    await db.sessions.put({ ...finished, sections, note, updatedAt: now });

    for (const { ref, focusNote } of focusUpdates) {
      if (ref.kind === 'piece') {
        const piece = await db.pieces.get(ref.pieceId);
        if (piece && piece.focusNote !== focusNote) {
          await db.pieces.put({ ...piece, focusNote, updatedAt: now });
        }
      } else if (ref.kind === 'technique') {
        const technique = await db.techniqueItems.get(ref.techniqueId);
        if (technique && technique.focusNote !== focusNote) {
          await db.techniqueItems.put({ ...technique, focusNote, updatedAt: now });
        }
      }
    }
  });
}

/** The session, `null` if it doesn't exist, `undefined` while loading. */
export function useSession(id: Id): Session | null | undefined {
  return useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
}

/** The session in progress, `null` if there is none, `undefined` while loading. */
export function useRunningSession(): Session | null | undefined {
  return useLiveQuery(
    async () => (await db.sessions.where('status').equals('running').first()) ?? null,
    [],
  );
}

/** Sessions planned but not started, earliest date first. */
export function usePlannedSessions(): Session[] | undefined {
  return useLiveQuery(() => db.sessions.where('status').equals('planned').sortBy('date'), []);
}

/** Finished sessions, newest first. */
export function useFinishedSessions(): Session[] | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.where('status').equals('finished').toArray();
    return sessions.sort((a, b) => sessionTime(b) - sessionTime(a));
  }, []);
}

/** Recently changed sessions, e.g. to look up the last BPM used for a piece. */
export function useRecentSessions(limit = 100): Session[] | undefined {
  return useLiveQuery(
    () => db.sessions.orderBy('updatedAt').reverse().limit(limit).toArray(),
    [limit],
  );
}

/** All sessions that include a technique item. */
export function useTechniqueSessions(techniqueId: Id): Session[] | undefined {
  return useLiveQuery(
    () => db.sessions.where('techniqueIds').equals(techniqueId).toArray(),
    [techniqueId],
  );
}
