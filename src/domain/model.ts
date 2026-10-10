/**
 * The app's data model. Every stored record carries an id and timestamps so that a
 * backup can be merged into existing data ("newer version wins").
 *
 * Rule: anything that can be calculated (durations, totals, streaks, goal progress)
 * is calculated from these records and never stored.
 */

import type { DateKey } from './dates';

export type Id = string;

/** Milliseconds since the Unix epoch (`Date.now()`). */
export type Timestamp = number;

export interface BaseRecord {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ---------- Repertoire ---------- */

export type PieceStatus = 'upNext' | 'learning' | 'maintaining' | 'shelved';

/** How far a piece got when it was shelved. */
export type ShelveOutcome = 'learned' | 'partlyLearned' | 'dropped';

/** Personal difficulty, as it feels to the player. */
export type Feel = 'easy' | 'medium' | 'hard';

/** One entry of a piece's status history. A period lasts until the next change. */
export interface StatusChange {
  status: PieceStatus;
  at: Timestamp;
  /** Only set when the status is `shelved`. */
  outcome?: ShelveOutcome;
}

/** A part of a piece practiced on its own, e.g. "Bars 13–16" or "Coda". */
export interface Passage {
  id: Id;
  createdAt: Timestamp;
  /** May be empty when bars are given ("Bars 13–16" is shown then). */
  name: string;
  fromBar?: number;
  toBar?: number;
  /** The current "focus next time" note for this passage. */
  focusNote: string;
  /** Learned well enough: moved out of the way, history kept. */
  solid: boolean;
}

export interface Piece extends BaseRecord {
  title: string;
  composer: string;
  /** e.g. "Op. 9 No. 2", "BWV 846". */
  catalogNumber?: string;
  /** Reference to the built-in catalog entry the piece was created from, if any. */
  catalogId?: string;
  tags: string[];
  /** Current status; always equal to the last entry of `statusHistory`. */
  status: PieceStatus;
  statusHistory: StatusChange[];
  feel?: Feel;
  targetDate?: DateKey;
  notes: string;
  /** The current "focus next time" note. */
  focusNote: string;
  /** Passages practiced on their own (missing in pieces saved before passages). */
  passages?: Passage[];
}

export interface TechniqueItem extends BaseRecord {
  name: string;
  /** e.g. "Scales", "Arpeggios", "Exercises". */
  category: string;
  notes: string;
  focusNote: string;
  archived: boolean;
}

/** A book of numbered exercises worked through in order, e.g. for sight-reading. */
export interface Book extends BaseRecord {
  name: string;
  /** How many exercises the book has, if known. */
  total?: number;
  notes: string;
  archived: boolean;
}

/* ---------- Sessions ---------- */

export interface SectionType extends BaseRecord {
  name: string;
  order: number;
  archived: boolean;
}

/** What a session item or goal is about. */
export type ItemRef =
  | { kind: 'piece'; pieceId: Id }
  | { kind: 'technique'; techniqueId: Id }
  | { kind: 'book'; bookId: Id }
  | { kind: 'free'; label: string };

export interface TemplateItem {
  id: Id;
  ref: ItemRef;
  budgetMinutes?: number;
}

export interface TemplateSection {
  id: Id;
  sectionTypeId: Id;
  items: TemplateItem[];
}

export interface SessionTemplate extends BaseRecord {
  name: string;
  sections: TemplateSection[];
}

/** A stretch of time an item's timer was running. `end` is null while it runs. */
export interface TimeSegment {
  start: Timestamp;
  end: Timestamp | null;
}

export interface PracticeEntry {
  id: Id;
  at: Timestamp;
  method: string;
  bpm?: number;
  /** The passage of the piece this entry was for; none means the whole piece. */
  passageId?: Id;
  /** Book entries: the numbers of the first and last exercise played. */
  from?: number;
  to?: number;
  note: string;
}

export interface SessionItem {
  id: Id;
  ref: ItemRef;
  budgetMinutes?: number;
  segments: TimeSegment[];
  /** Manual correction in seconds, added to the timed segments (may be negative). */
  adjustSeconds: number;
  entries: PracticeEntry[];
  note: string;
  focusNext: string;
}

export interface SessionSection {
  id: Id;
  sectionTypeId: Id;
  items: SessionItem[];
}

export type SessionStatus = 'planned' | 'running' | 'finished';

export interface Session extends BaseRecord {
  /** The day the session counts for (set to the start day when it starts). */
  date: DateKey;
  status: SessionStatus;
  /** Optional title, e.g. the name of the template it was created from. */
  name?: string;
  templateId?: Id;
  sections: SessionSection[];
  note: string;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  /** The item shown on the session screen (running or paused). */
  currentItemId?: Id;
  /** Last time the user did anything in the session; used to detect a forgotten timer. */
  lastActivityAt?: Timestamp;
  /** Search index only: ids of all pieces in `sections`, kept in sync on every save. */
  pieceIds: Id[];
  /** Search index only: ids of all technique items in `sections`. */
  techniqueIds: Id[];
  /** Search index only: ids of all books in `sections` (missing in sessions saved before books). */
  bookIds?: Id[];
}

/* ---------- Cycles ---------- */

export type GoalKind = 'check' | 'bpm' | 'time';

export interface Goal {
  id: Id;
  ref: ItemRef;
  kind: GoalKind;
  /** Optional wording, e.g. "All major keys, 2 octaves". */
  label?: string;
  fromBpm?: number;
  toBpm?: number;
  targetMinutes?: number;
  /** Manually ticked off (used by `check` goals). */
  done: boolean;
}

export interface Cycle extends BaseRecord {
  name: string;
  startDate: DateKey;
  lengthDays: number;
  goals: Goal[];
  reflection: string;
  closedAt?: Timestamp;
}

/* ---------- Settings & bookkeeping ---------- */

export const SETTINGS_ID = 'settings';

export interface Settings extends BaseRecord {
  weeklyTarget: number;
  /** Practice methods offered as quick-log buttons, in display order. */
  methods: string[];
  /** What happens when an item's time budget is used up. Default: sound and vibration. */
  budgetSignal?: BudgetSignal;
  lastBackupAt?: Timestamp;
  /** The backup reminder stays hidden until then ("Later"). */
  backupReminderSnoozedUntil?: Timestamp;
}

export type BudgetSignal = 'soundAndVibration' | 'vibration' | 'off';

/** Remembers a deletion, so merging an older backup doesn't bring the record back. */
export interface Tombstone {
  /** The id of the deleted record. */
  id: Id;
  table: SyncedTable;
  deletedAt: Timestamp;
}

/** The tables that hold user data and take part in backups. */
export type SyncedTable =
  | 'pieces'
  | 'techniqueItems'
  | 'books'
  | 'sectionTypes'
  | 'templates'
  | 'sessions'
  | 'cycles'
  | 'settings';
