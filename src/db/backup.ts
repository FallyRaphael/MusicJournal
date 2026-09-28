import { useLiveQuery } from 'dexie-react-hooks';
import { mergeData, SYNCED_TABLES, type BackupData, type ImportSummary } from '../domain/backup';
import type { Timestamp } from '../domain/model';
import { db } from './database';
import { updateSettings } from './settings';

const SNAPSHOT_ID = 'before-import';

/** Every table that holds user data, plus tombstones. */
const dataTables = () => [...SYNCED_TABLES.map((t) => db.table(t)), db.tombstones];

async function readAll(): Promise<BackupData> {
  const entries = await Promise.all(
    [...SYNCED_TABLES, 'tombstones' as const].map(
      async (table) => [table, await db.table(table).toArray()] as const,
    ),
  );
  return Object.fromEntries(entries) as unknown as BackupData;
}

async function writeAll(data: BackupData): Promise<void> {
  for (const table of [...SYNCED_TABLES, 'tombstones' as const]) {
    await db.table(table).clear();
    await db.table(table).bulkPut(data[table]);
  }
}

/** All user data, read consistently in one transaction. */
export function readAllData(): Promise<BackupData> {
  return db.transaction('r', dataTables(), readAll);
}

export type ImportMode = 'merge' | 'replace';

/**
 * Imports a backup. The current data is saved as a snapshot first, all in one
 * transaction: either everything is imported (and can be undone) or nothing changes.
 */
export async function importData(
  incoming: BackupData,
  mode: ImportMode,
): Promise<ImportSummary | undefined> {
  return db.transaction('rw', [...dataTables(), db.snapshots], async () => {
    const current = await readAll();
    await db.snapshots.put({ id: SNAPSHOT_ID, takenAt: Date.now(), data: current });
    if (mode === 'merge') {
      const { result, summary } = mergeData(current, incoming);
      await writeAll(result);
      return summary;
    }
    // A backup always has section types; keep the current ones if one somehow doesn't.
    await writeAll(
      incoming.sectionTypes.length > 0
        ? incoming
        : { ...incoming, sectionTypes: current.sectionTypes },
    );
    return undefined;
  });
}

/** Restores the data from before the last import. */
export async function undoLastImport(): Promise<void> {
  await db.transaction('rw', [...dataTables(), db.snapshots], async () => {
    const snapshot = await db.snapshots.get(SNAPSHOT_ID);
    if (!snapshot) return;
    await writeAll(snapshot.data);
    await db.snapshots.delete(SNAPSHOT_ID);
  });
}

/** When the undo snapshot was taken, if there is one. */
export function useLastImport(): { takenAt: Timestamp } | null | undefined {
  return useLiveQuery(async () => {
    const snapshot = await db.snapshots.get(SNAPSHOT_ID);
    return snapshot ? { takenAt: snapshot.takenAt } : null;
  }, []);
}

export function markBackedUp(at: Timestamp = Date.now()): Promise<void> {
  return updateSettings({ lastBackupAt: at, backupReminderSnoozedUntil: undefined });
}

/** Whether there is anything worth backing up (pieces or sessions). */
export function useHasData(): boolean | undefined {
  return useLiveQuery(async () => (await db.pieces.count()) + (await db.sessions.count()) > 0, []);
}
