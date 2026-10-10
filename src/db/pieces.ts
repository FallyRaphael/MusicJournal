import { useLiveQuery } from 'dexie-react-hooks';
import { newId } from '../domain/ids';
import type {
  Feel,
  Id,
  Passage,
  Piece,
  PieceStatus,
  Session,
  ShelveOutcome,
} from '../domain/model';
import { withStatusChange } from '../domain/pieces';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

/** The fields a user edits in the piece form. */
export interface PieceDetails {
  title: string;
  composer: string;
  catalogNumber?: string;
  catalogId?: string;
  tags: string[];
  feel?: Feel;
  targetDate?: string;
  notes: string;
}

export async function createPiece(details: PieceDetails, status: PieceStatus): Promise<Piece> {
  const now = Date.now();
  const piece = newRecord<Omit<Piece, 'id' | 'createdAt' | 'updatedAt'>>(
    { ...details, status, statusHistory: [{ status, at: now }], focusNote: '' },
    now,
  );
  await db.pieces.add(piece);
  return piece;
}

export async function updatePiece(
  id: Id,
  changes: Partial<PieceDetails> & { focusNote?: string },
): Promise<void> {
  await db.transaction('rw', db.pieces, async () => {
    const piece = await db.pieces.get(id);
    if (!piece) return;
    // Optional fields set to undefined are removed rather than stored as undefined.
    const next: Piece = { ...piece, ...changes, updatedAt: Date.now() };
    for (const key of ['catalogNumber', 'catalogId', 'feel', 'targetDate'] as const) {
      if (next[key] === undefined || next[key] === '') delete next[key];
    }
    await db.pieces.put(next);
  });
}

export async function changePieceStatus(
  id: Id,
  status: PieceStatus,
  outcome?: ShelveOutcome,
): Promise<void> {
  await db.transaction('rw', db.pieces, async () => {
    const piece = await db.pieces.get(id);
    if (!piece) return;
    const now = Date.now();
    const next = withStatusChange(piece, status, now, outcome);
    if (next === piece) return;
    await db.pieces.put({ ...piece, ...next, updatedAt: now });
  });
}

/** Changes a piece's passages in one read–change–write step. */
async function mutatePassages(
  pieceId: Id,
  change: (passages: Passage[]) => Passage[],
): Promise<void> {
  await db.transaction('rw', db.pieces, async () => {
    const piece = await db.pieces.get(pieceId);
    if (!piece) return;
    await db.pieces.put({
      ...piece,
      passages: change(piece.passages ?? []),
      updatedAt: Date.now(),
    });
  });
}

export type PassageDetails = Pick<Passage, 'name' | 'fromBar' | 'toBar'>;

export async function createPassage(pieceId: Id, details: PassageDetails): Promise<Passage> {
  const passage: Passage = {
    id: newId(),
    createdAt: Date.now(),
    ...withoutEmptyBars(details),
    focusNote: '',
    solid: false,
  };
  await mutatePassages(pieceId, (passages) => [...passages, passage]);
  return passage;
}

export function updatePassage(
  pieceId: Id,
  passageId: Id,
  changes: Partial<PassageDetails & Pick<Passage, 'focusNote' | 'solid'>>,
): Promise<void> {
  return mutatePassages(pieceId, (passages) =>
    passages.map((p) => (p.id === passageId ? withoutEmptyBars({ ...p, ...changes }) : p)),
  );
}

/** Removes a passage; entries logged for it count for the whole piece from then on. */
export function deletePassage(pieceId: Id, passageId: Id): Promise<void> {
  return mutatePassages(pieceId, (passages) => passages.filter((p) => p.id !== passageId));
}

function withoutEmptyBars<T extends Partial<PassageDetails>>(passage: T): T {
  const next = { ...passage };
  if (next.fromBar === undefined) delete next.fromBar;
  if (next.toBar === undefined) delete next.toBar;
  return next;
}

export function deletePiece(id: Id): Promise<void> {
  return deleteRecord('pieces', id);
}

export function usePieces(): Piece[] | undefined {
  return useLiveQuery(() => db.pieces.toArray(), []);
}

/** The piece, `null` if it doesn't exist, `undefined` while loading. */
export function usePiece(id: Id): Piece | null | undefined {
  return useLiveQuery(async () => (await db.pieces.get(id)) ?? null, [id]);
}

/** All sessions that include the piece. */
export function usePieceSessions(pieceId: Id): Session[] | undefined {
  return useLiveQuery(() => db.sessions.where('pieceIds').equals(pieceId).toArray(), [pieceId]);
}

/** All sessions that include at least one piece (for "last practiced"). */
export function useSessionsWithPieces(): Session[] | undefined {
  return useLiveQuery(() => db.sessions.where('pieceIds').above('').distinct().toArray(), []);
}
