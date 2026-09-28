/**
 * Pure session logic: building plans, the timer (start / pause / switch items), logging
 * and finishing. Every function returns a new object and never mutates its input.
 *
 * Timer rule: an item's time is stored as segments with start/end timestamps. At most one
 * segment in the whole session is open (end === null) – that item is "running".
 */

import { toDateKey } from './dates';
import { newId } from './ids';
import type {
  Id,
  ItemRef,
  PracticeEntry,
  Session,
  SessionItem,
  SessionSection,
  TemplateSection,
  TimeSegment,
  Timestamp,
} from './model';
import { itemSeconds } from './timer';

/* ---------- Plans: sections of items, shared by sessions and templates ---------- */

export interface PlanItem {
  id: Id;
  ref: ItemRef;
  budgetMinutes?: number;
}

export interface PlanSection<T extends PlanItem = PlanItem> {
  id: Id;
  sectionTypeId: Id;
  items: T[];
}

/** Section type id → position; sections are always kept in this order. */
export type SectionOrder = ReadonlyMap<Id, number>;

export function newSessionItem(ref: ItemRef, budgetMinutes?: number): SessionItem {
  return {
    id: newId(),
    ref,
    ...(budgetMinutes ? { budgetMinutes } : {}),
    segments: [],
    adjustSeconds: 0,
    entries: [],
    note: '',
    focusNext: '',
  };
}

/** Fresh session sections (new ids, no times) with the items and budgets of a plan. */
export function toSessionSections(sections: readonly PlanSection[]): SessionSection[] {
  return sections.map((section) => ({
    id: newId(),
    sectionTypeId: section.sectionTypeId,
    items: section.items.map((item) => newSessionItem(item.ref, item.budgetMinutes)),
  }));
}

/** Template sections (new ids) with only the items and budgets of a plan. */
export function toTemplateSections(sections: readonly PlanSection[]): TemplateSection[] {
  return sections.map((section) => ({
    id: newId(),
    sectionTypeId: section.sectionTypeId,
    items: section.items.map((item) => ({
      id: newId(),
      ref: item.ref,
      ...(item.budgetMinutes ? { budgetMinutes: item.budgetMinutes } : {}),
    })),
  }));
}

const orderOf = (order: SectionOrder, sectionTypeId: Id) =>
  order.get(sectionTypeId) ?? Number.MAX_SAFE_INTEGER;

/** Adds an item at the end of its section, creating the section in type order if needed. */
export function addPlanItem<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
  sectionTypeId: Id,
  item: T,
  order: SectionOrder,
): PlanSection<T>[] {
  if (sections.some((s) => s.sectionTypeId === sectionTypeId)) {
    return sections.map((s) =>
      s.sectionTypeId === sectionTypeId ? { ...s, items: [...s.items, item] } : s,
    );
  }
  const created: PlanSection<T> = { id: newId(), sectionTypeId, items: [item] };
  const index = sections.findIndex(
    (s) => orderOf(order, s.sectionTypeId) > orderOf(order, sectionTypeId),
  );
  return index === -1
    ? [...sections, created]
    : [...sections.slice(0, index), created, ...sections.slice(index)];
}

/** Removes an item; a section that becomes empty is removed too. */
export function removePlanItem<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
  itemId: Id,
): PlanSection<T>[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((item) => item.id !== itemId) }))
    .filter((s) => s.items.length > 0);
}

/** Moves an item one place up (-1) or down (1) within its section. */
export function movePlanItem<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
  itemId: Id,
  direction: -1 | 1,
): PlanSection<T>[] {
  return sections.map((s) => {
    const index = s.items.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= s.items.length) return s;
    const items = [...s.items];
    [items[index], items[target]] = [items[target], items[index]];
    return { ...s, items };
  });
}

export function updatePlanItem<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
  itemId: Id,
  update: (item: T) => T,
): PlanSection<T>[] {
  return sections.map((s) =>
    s.items.some((item) => item.id === itemId)
      ? { ...s, items: s.items.map((item) => (item.id === itemId ? update(item) : item)) }
      : s,
  );
}

/** Changes an item's time budget; 0 removes it. */
export function changeBudget<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
  itemId: Id,
  update: (minutes: number) => number,
): PlanSection<T>[] {
  return updatePlanItem(sections, itemId, (item) => {
    const minutes = Math.max(0, Math.round(update(item.budgetMinutes ?? 0)));
    const next = { ...item };
    if (minutes > 0) next.budgetMinutes = minutes;
    else delete next.budgetMinutes;
    return next;
  });
}

export interface PlanPosition<T extends PlanItem> {
  item: T;
  section: PlanSection<T>;
  /** Position among all items of the plan. */
  index: number;
}

/** All items in order, with their section. */
export function planItems<T extends PlanItem>(
  sections: readonly PlanSection<T>[],
): PlanPosition<T>[] {
  return sections
    .flatMap((section) => section.items.map((item) => ({ item, section })))
    .map((entry, index) => ({ ...entry, index }));
}

/* ---------- Session derived values ---------- */

/** The ids of pieces and technique items in a session (stored as search indexes). */
export function sessionIndexes(
  sections: readonly SessionSection[],
): Pick<Session, 'pieceIds' | 'techniqueIds'> {
  const pieceIds = new Set<Id>();
  const techniqueIds = new Set<Id>();
  for (const { item } of planItems(sections)) {
    if (item.ref.kind === 'piece') pieceIds.add(item.ref.pieceId);
    if (item.ref.kind === 'technique') techniqueIds.add(item.ref.techniqueId);
  }
  return { pieceIds: [...pieceIds], techniqueIds: [...techniqueIds] };
}

export function findItem(session: Pick<Session, 'sections'>, itemId: Id): SessionItem | undefined {
  for (const section of session.sections) {
    const item = section.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  return undefined;
}

const openSegmentOf = (item: SessionItem): TimeSegment | undefined =>
  item.segments.find((segment) => segment.end === null);

/** The item whose timer is running, if any. */
export function runningItem(session: Pick<Session, 'sections'>): SessionItem | undefined {
  return planItems(session.sections).find(({ item }) => openSegmentOf(item))?.item;
}

/** The item on screen: the remembered one if it still exists, else the first. */
export function currentItemId(session: Session): Id | undefined {
  const items = planItems(session.sections);
  if (session.currentItemId && items.some(({ item }) => item.id === session.currentItemId)) {
    return session.currentItemId;
  }
  return items[0]?.item.id;
}

/** The next (1) or previous (-1) item, or undefined at either end. */
export function neighborItemId(session: Session, fromId: Id, direction: -1 | 1): Id | undefined {
  const items = planItems(session.sections);
  const index = items.findIndex(({ item }) => item.id === fromId);
  return index === -1 ? undefined : items[index + direction]?.item.id;
}

export function sessionSeconds(session: Pick<Session, 'sections'>, now: Timestamp): number {
  return planItems(session.sections).reduce((sum, { item }) => sum + itemSeconds(item, now), 0);
}

/* ---------- Timer ---------- */

function mapItems(session: Session, update: (item: SessionItem) => SessionItem): Session {
  return {
    ...session,
    sections: session.sections.map((s) => ({ ...s, items: s.items.map(update) })),
  };
}

function closeOpenSegments(session: Session, now: Timestamp): Session {
  if (!runningItem(session)) return session;
  return mapItems(session, (item) =>
    openSegmentOf(item)
      ? {
          ...item,
          segments: item.segments.map((seg) =>
            seg.end === null ? { ...seg, end: Math.max(seg.start, now) } : seg,
          ),
        }
      : item,
  );
}

/**
 * Starts the timer on an item (stopping any other). The first start turns a planned
 * session into a running one that counts for the current day.
 */
export function startItem(session: Session, itemId: Id, now: Timestamp): Session {
  if (!findItem(session, itemId)) return session;
  if (runningItem(session)?.id === itemId) return { ...session, lastActivityAt: now };
  const stopped = closeOpenSegments(session, now);
  const firstStart = stopped.startedAt === undefined;
  return {
    ...mapItems(stopped, (item) =>
      item.id === itemId
        ? { ...item, segments: [...item.segments, { start: now, end: null }] }
        : item,
    ),
    status: 'running',
    startedAt: stopped.startedAt ?? now,
    date: firstStart ? toDateKey(new Date(now)) : stopped.date,
    currentItemId: itemId,
    lastActivityAt: now,
  };
}

export function pause(session: Session, now: Timestamp): Session {
  return { ...closeOpenSegments(session, now), lastActivityAt: now };
}

/** Shows another item. If a timer is running, it moves to that item. */
export function selectItem(session: Session, itemId: Id, now: Timestamp): Session {
  if (runningItem(session)) return startItem(session, itemId, now);
  return { ...session, currentItemId: itemId, lastActivityAt: now };
}

export function finishSession(session: Session, now: Timestamp): Session {
  return {
    ...closeOpenSegments(session, now),
    status: 'finished',
    finishedAt: now,
    lastActivityAt: now,
  };
}

/* ---------- Editing items ---------- */

export function updateSessionItem(
  session: Session,
  itemId: Id,
  update: (item: SessionItem) => SessionItem,
  now: Timestamp,
): Session {
  return {
    ...mapItems(session, (item) => (item.id === itemId ? update(item) : item)),
    lastActivityAt: now,
  };
}

export function logEntry(
  session: Session,
  itemId: Id,
  fields: Omit<PracticeEntry, 'id' | 'at'>,
  now: Timestamp,
): Session {
  const entry: PracticeEntry = {
    id: newId(),
    at: now,
    method: fields.method,
    ...(fields.bpm !== undefined ? { bpm: fields.bpm } : {}),
    note: fields.note,
  };
  return updateSessionItem(
    session,
    itemId,
    (item) => ({ ...item, entries: [...item.entries, entry] }),
    now,
  );
}

export function removeEntry(session: Session, itemId: Id, entryId: Id, now: Timestamp): Session {
  return updateSessionItem(
    session,
    itemId,
    (item) => ({ ...item, entries: item.entries.filter((e) => e.id !== entryId) }),
    now,
  );
}

/** Sets an item's total time by adjusting its manual correction; timed segments stay. */
export function setItemSeconds(item: SessionItem, seconds: number, now: Timestamp): SessionItem {
  const timed = itemSeconds({ segments: item.segments, adjustSeconds: 0 }, now);
  return { ...item, adjustSeconds: Math.max(0, Math.round(seconds)) - timed };
}

/** Removes an item (stopping its timer); the item on screen moves to a neighbour. */
export function removeSessionItem(session: Session, itemId: Id, now: Timestamp): Session {
  const stopped = runningItem(session)?.id === itemId ? closeOpenSegments(session, now) : session;
  const current = currentItemId(stopped);
  const replacement =
    current === itemId
      ? (neighborItemId(stopped, itemId, 1) ?? neighborItemId(stopped, itemId, -1))
      : current;
  return {
    ...stopped,
    sections: removePlanItem(stopped.sections, itemId),
    currentItemId: replacement,
    lastActivityAt: now,
  };
}

/* ---------- Forgotten timer ---------- */

export const FORGOTTEN_AFTER_BUDGET_MS = 30 * 60_000;
export const FORGOTTEN_WITHOUT_BUDGET_MS = 60 * 60_000;

export interface ForgottenTimer {
  itemId: Id;
  /** When the user last did something in the session. */
  lastActivityAt: Timestamp;
  /** A sensible time for the item: its budget, or the time up to the last activity. */
  suggestedSeconds: number;
}

/**
 * Detects a timer that was probably left running: an item 30 min past its budget, or
 * running for an hour without a budget, with no activity in that time.
 */
export function forgottenTimer(session: Session, now: Timestamp): ForgottenTimer | null {
  const item = runningItem(session);
  if (!item) return null;
  const open = openSegmentOf(item)!;
  const lastActivityAt = Math.max(session.lastActivityAt ?? 0, open.start);
  const idle = now - lastActivityAt;

  if (item.budgetMinutes) {
    const over = itemSeconds(item, now) * 1000 - item.budgetMinutes * 60_000;
    if (over < FORGOTTEN_AFTER_BUDGET_MS || idle < FORGOTTEN_AFTER_BUDGET_MS) return null;
    return { itemId: item.id, lastActivityAt, suggestedSeconds: item.budgetMinutes * 60 };
  }
  if (idle < FORGOTTEN_WITHOUT_BUDGET_MS) return null;
  return { itemId: item.id, lastActivityAt, suggestedSeconds: itemSeconds(item, lastActivityAt) };
}
