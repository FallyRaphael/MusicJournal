/**
 * Backup files: format, validation, and how a backup is merged into existing data.
 *
 * Merge rules (one device, so conflicts are rare and simple):
 * - A record present in only one side is kept.
 * - A record present in both: the newer `updatedAt` wins.
 * - A deletion (tombstone) wins over versions of the record that are not newer than it.
 */

import * as z from 'zod';
import type {
  Cycle,
  Id,
  Piece,
  SectionType,
  Session,
  SessionTemplate,
  Settings,
  SyncedTable,
  TechniqueItem,
  Timestamp,
  Tombstone,
} from './model';

export const BACKUP_APP = 'practice-journal';
export const BACKUP_FORMAT_VERSION = 1;

export const SYNCED_TABLES = [
  'pieces',
  'techniqueItems',
  'sectionTypes',
  'templates',
  'sessions',
  'cycles',
  'settings',
] as const satisfies readonly SyncedTable[];

export interface BackupData {
  pieces: Piece[];
  techniqueItems: TechniqueItem[];
  sectionTypes: SectionType[];
  templates: SessionTemplate[];
  sessions: Session[];
  cycles: Cycle[];
  settings: Settings[];
  tombstones: Tombstone[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  formatVersion: number;
  exportedAt: Timestamp;
  data: BackupData;
}

export function createBackupFile(data: BackupData, exportedAt: Timestamp): BackupFile {
  return { app: BACKUP_APP, formatVersion: BACKUP_FORMAT_VERSION, exportedAt, data };
}

/** "practice-journal-2026-09-28.json" */
export function backupFileName(dateKey: string): string {
  return `practice-journal-${dateKey}.json`;
}

/* ---------- Validation ---------- */

// Loose objects keep fields this version doesn't know, so nothing is silently dropped.
const id = z.string().min(1);
const time = z.number().finite();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const base = { id, createdAt: time, updatedAt: time };

const itemRef = z.discriminatedUnion('kind', [
  z.looseObject({ kind: z.literal('piece'), pieceId: id }),
  z.looseObject({ kind: z.literal('technique'), techniqueId: id }),
  z.looseObject({ kind: z.literal('free'), label: z.string() }),
]);
const pieceStatus = z.enum(['upNext', 'learning', 'maintaining', 'shelved']);

const piece = z.looseObject({
  ...base,
  title: z.string(),
  composer: z.string(),
  catalogNumber: z.string().optional(),
  catalogId: z.string().optional(),
  tags: z.array(z.string()),
  status: pieceStatus,
  statusHistory: z.array(
    z.looseObject({
      status: pieceStatus,
      at: time,
      outcome: z.enum(['learned', 'partlyLearned', 'dropped']).optional(),
    }),
  ),
  feel: z.enum(['easy', 'medium', 'hard']).optional(),
  targetDate: dateKey.optional(),
  notes: z.string(),
  focusNote: z.string(),
});

const techniqueItem = z.looseObject({
  ...base,
  name: z.string(),
  category: z.string(),
  notes: z.string(),
  focusNote: z.string(),
  archived: z.boolean(),
});

const sectionType = z.looseObject({
  ...base,
  name: z.string(),
  order: z.number(),
  archived: z.boolean(),
});

const budget = z.number().nonnegative().optional();

const template = z.looseObject({
  ...base,
  name: z.string(),
  sections: z.array(
    z.looseObject({
      id,
      sectionTypeId: id,
      items: z.array(z.looseObject({ id, ref: itemRef, budgetMinutes: budget })),
    }),
  ),
});

const sessionItem = z.looseObject({
  id,
  ref: itemRef,
  budgetMinutes: budget,
  segments: z.array(z.looseObject({ start: time, end: time.nullable() })),
  adjustSeconds: z.number(),
  entries: z.array(
    z.looseObject({
      id,
      at: time,
      method: z.string(),
      bpm: z.number().optional(),
      note: z.string(),
    }),
  ),
  note: z.string(),
  focusNext: z.string(),
});

const session = z.looseObject({
  ...base,
  date: dateKey,
  status: z.enum(['planned', 'running', 'finished']),
  name: z.string().optional(),
  templateId: id.optional(),
  sections: z.array(z.looseObject({ id, sectionTypeId: id, items: z.array(sessionItem) })),
  note: z.string(),
  startedAt: time.optional(),
  finishedAt: time.optional(),
  currentItemId: id.optional(),
  lastActivityAt: time.optional(),
  pieceIds: z.array(id),
  techniqueIds: z.array(id),
});

const cycle = z.looseObject({
  ...base,
  name: z.string(),
  startDate: dateKey,
  lengthDays: z.number().int().positive(),
  goals: z.array(
    z.looseObject({
      id,
      ref: itemRef,
      kind: z.enum(['check', 'bpm', 'time']),
      label: z.string().optional(),
      fromBpm: z.number().optional(),
      toBpm: z.number().optional(),
      targetMinutes: z.number().optional(),
      done: z.boolean(),
    }),
  ),
  reflection: z.string(),
  closedAt: time.optional(),
});

const settings = z.looseObject({
  ...base,
  weeklyTarget: z.number().int().positive(),
  methods: z.array(z.string()),
  budgetSignal: z.enum(['soundAndVibration', 'vibration', 'off']).optional(),
  lastBackupAt: time.optional(),
  backupReminderSnoozedUntil: time.optional(),
});

const backupData = z.looseObject({
  pieces: z.array(piece),
  techniqueItems: z.array(techniqueItem),
  sectionTypes: z.array(sectionType),
  templates: z.array(template),
  sessions: z.array(session),
  cycles: z.array(cycle),
  settings: z.array(settings),
  tombstones: z.array(z.looseObject({ id, table: z.enum(SYNCED_TABLES), deletedAt: time })),
});

const envelope = z.looseObject({
  app: z.literal(BACKUP_APP),
  formatVersion: z.number().int(),
  exportedAt: time,
});

export type ParseResult = { ok: true; file: BackupFile } | { ok: false; error: string };

/** Reads and checks a backup file's text. Nothing is changed if it isn't valid. */
export function parseBackupFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t a Practice Journal backup (it’s not JSON).' };
  }
  const head = envelope.safeParse(raw);
  if (!head.success) {
    return { ok: false, error: 'This file isn’t a Practice Journal backup.' };
  }
  if (head.data.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'This backup comes from a newer version of the app. Update the app, then try again.',
    };
  }
  const data = backupData.safeParse((raw as { data?: unknown }).data);
  if (!data.success) {
    const issue = data.error.issues[0];
    const where = issue.path.join('.');
    return { ok: false, error: `The backup file is damaged (${where}: ${issue.message}).` };
  }
  return {
    ok: true,
    file: {
      app: BACKUP_APP,
      formatVersion: head.data.formatVersion,
      exportedAt: head.data.exportedAt,
      // The schema matches the model; the cast only adds the precise record types.
      data: data.data as unknown as BackupData,
    },
  };
}

/* ---------- Merging ---------- */

export interface TableChanges {
  added: number;
  updated: number;
  removed: number;
}

export type ImportSummary = Record<SyncedTable, TableChanges>;

interface AnyRecord {
  id: Id;
  updatedAt: Timestamp;
}

/** The merged data, and what changed compared to `current`. */
export function mergeData(
  current: BackupData,
  incoming: BackupData,
): { result: BackupData; summary: ImportSummary } {
  const tombstones = new Map<Id, Tombstone>();
  for (const t of [...current.tombstones, ...incoming.tombstones]) {
    const known = tombstones.get(t.id);
    if (!known || t.deletedAt > known.deletedAt) tombstones.set(t.id, t);
  }

  const result = { tombstones: [] } as unknown as BackupData;
  const summary = {} as ImportSummary;

  for (const table of SYNCED_TABLES) {
    const changes: TableChanges = { added: 0, updated: 0, removed: 0 };
    const records = new Map<Id, AnyRecord>((current[table] as AnyRecord[]).map((r) => [r.id, r]));

    for (const record of incoming[table] as AnyRecord[]) {
      const deleted = tombstones.get(record.id);
      if (deleted && deleted.deletedAt >= record.updatedAt) continue; // stays deleted
      const local = records.get(record.id);
      if (!local) {
        records.set(record.id, record);
        changes.added += 1;
      } else if (record.updatedAt > local.updatedAt) {
        records.set(record.id, record);
        changes.updated += 1;
      }
    }

    // Deletions from the backup remove local records that weren't changed afterwards.
    for (const [recordId, record] of records) {
      const deleted = tombstones.get(recordId);
      if (deleted && deleted.deletedAt >= record.updatedAt) {
        records.delete(recordId);
        changes.removed += 1;
      }
    }

    (result as unknown as Record<string, AnyRecord[]>)[table] = [...records.values()];
    summary[table] = changes;
  }

  // A tombstone is only needed while its record is gone.
  const present = new Set(SYNCED_TABLES.flatMap((t) => result[t].map((r) => r.id)));
  result.tombstones = [...tombstones.values()].filter((t) => !present.has(t.id));
  return { result, summary };
}

/** What replacing `current` with `incoming` changes: new, changed and removed records. */
export function replaceSummary(current: BackupData, incoming: BackupData): ImportSummary {
  const summary = {} as ImportSummary;
  for (const table of SYNCED_TABLES) {
    const before = new Map((current[table] as AnyRecord[]).map((r) => [r.id, r]));
    const after = new Map((incoming[table] as AnyRecord[]).map((r) => [r.id, r]));
    const changes: TableChanges = { added: 0, updated: 0, removed: 0 };
    for (const [recordId, record] of after) {
      const old = before.get(recordId);
      if (!old) changes.added += 1;
      else if (old.updatedAt !== record.updatedAt) changes.updated += 1;
    }
    for (const recordId of before.keys()) if (!after.has(recordId)) changes.removed += 1;
    summary[table] = changes;
  }
  return summary;
}

/** Whether an import would change anything at all. */
export function hasChanges(summary: ImportSummary): boolean {
  return SYNCED_TABLES.some((t) => summary[t].added + summary[t].updated + summary[t].removed > 0);
}

/* ---------- Reminder ---------- */

export const BACKUP_REMINDER_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Whether to remind about a backup: there is data worth keeping, and it has been two weeks
 * since the last backup (or since the data was started, if there never was one).
 */
export function backupDue(options: {
  hasData: boolean;
  lastBackupAt?: Timestamp;
  dataSince: Timestamp;
  snoozedUntil?: Timestamp;
  now: Timestamp;
}): boolean {
  const { hasData, lastBackupAt, dataSince, snoozedUntil, now } = options;
  if (!hasData || (snoozedUntil !== undefined && now < snoozedUntil)) return false;
  return now - (lastBackupAt ?? dataSince) > BACKUP_REMINDER_DAYS * DAY;
}
