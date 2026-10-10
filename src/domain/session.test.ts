import { describe, expect, it } from 'vitest';
import type { Session } from './model';
import {
  addPlanItem,
  changeBudget,
  currentItemId,
  finishSession,
  forgottenTimer,
  logEntry,
  movePlanItem,
  neighborItemId,
  newSessionItem,
  pause,
  removePlanItem,
  removeSessionItem,
  runningItem,
  selectItem,
  sessionIndexes,
  sessionSeconds,
  setItemSeconds,
  startItem,
  toSessionSections,
  type PlanItem,
  type PlanSection,
} from './session';
import { itemSeconds } from './timer';

const MIN = 60_000;
const order = new Map([
  ['warmup', 0],
  ['technique', 1],
  ['repertoire', 2],
]);

function plan(): PlanSection<PlanItem>[] {
  let sections: PlanSection<PlanItem>[] = [];
  sections = addPlanItem(
    sections,
    'repertoire',
    { id: 'noct', ref: { kind: 'piece', pieceId: 'p1' } },
    order,
  );
  sections = addPlanItem(
    sections,
    'warmup',
    { id: 'scales', ref: { kind: 'free', label: 'Scales' } },
    order,
  );
  sections = addPlanItem(
    sections,
    'repertoire',
    { id: 'clair', ref: { kind: 'piece', pieceId: 'p2' }, budgetMinutes: 15 },
    order,
  );
  return sections;
}

function session(overrides: Partial<Session> = {}): Session {
  const sections = plan().map((s) => ({
    ...s,
    items: s.items.map((item) => ({
      ...newSessionItem(item.ref, item.budgetMinutes),
      id: item.id,
    })),
  }));
  return {
    id: 's',
    createdAt: 0,
    updatedAt: 0,
    date: '2026-09-20',
    status: 'planned',
    sections,
    note: '',
    ...sessionIndexes(sections),
    ...overrides,
  };
}

const ids = (sections: readonly PlanSection[]) => sections.map((s) => s.items.map((i) => i.id));

describe('plans', () => {
  it('keeps sections in section-type order, whatever order items are added in', () => {
    const sections = plan();
    expect(sections.map((s) => s.sectionTypeId)).toEqual(['warmup', 'repertoire']);
    expect(ids(sections)).toEqual([['scales'], ['noct', 'clair']]);
  });

  it('moves items within their section and drops empty sections', () => {
    expect(ids(movePlanItem(plan(), 'clair', -1))).toEqual([['scales'], ['clair', 'noct']]);
    expect(ids(movePlanItem(plan(), 'clair', 1))).toEqual([['scales'], ['noct', 'clair']]);
    expect(ids(removePlanItem(plan(), 'scales'))).toEqual([['noct', 'clair']]);
  });

  it('copies a plan into fresh session items without times', () => {
    const sections = toSessionSections(plan());
    const clair = sections[1].items[1];
    expect(clair.id).not.toBe('clair');
    expect(clair.budgetMinutes).toBe(15);
    expect(clair.segments).toEqual([]);
  });

  it('indexes the pieces of a session', () => {
    expect(sessionIndexes(session().sections)).toEqual({
      pieceIds: ['p1', 'p2'],
      techniqueIds: [],
      bookIds: [],
    });
  });
});

describe('the timer', () => {
  it('starts a planned session on the start day', () => {
    const now = new Date(2026, 8, 27, 18, 0).getTime();
    const started = startItem(session(), 'noct', now);
    expect(started.status).toBe('running');
    expect(started.startedAt).toBe(now);
    expect(started.date).toBe('2026-09-27');
    expect(runningItem(started)?.id).toBe('noct');
  });

  it('runs only one item at a time', () => {
    let s = startItem(session(), 'scales', 0);
    s = startItem(s, 'noct', 5 * MIN);
    expect(runningItem(s)?.id).toBe('noct');
    const scales = s.sections[0].items[0];
    expect(scales.segments).toEqual([{ start: 0, end: 5 * MIN }]);
  });

  it('pauses and resumes into separate segments', () => {
    let s = startItem(session(), 'noct', 0);
    s = pause(s, 2 * MIN);
    s = startItem(s, 'noct', 10 * MIN);
    expect(runningItem(s)?.id).toBe('noct');
    expect(sessionSeconds(s, 11 * MIN)).toBe(3 * 60);
  });

  it('keeps the first start time and day when resuming later', () => {
    let s = startItem(session(), 'noct', 0);
    s = pause(s, MIN);
    s = startItem(s, 'clair', 3 * 24 * 60 * MIN);
    expect(s.startedAt).toBe(0);
    expect(s.date).toBe(startItem(session(), 'noct', 0).date);
  });

  it('moves a running timer when another item is selected, but not a paused one', () => {
    const running = selectItem(startItem(session(), 'scales', 0), 'clair', MIN);
    expect(runningItem(running)?.id).toBe('clair');
    const paused = selectItem(pause(running, 2 * MIN), 'noct', 3 * MIN);
    expect(runningItem(paused)).toBeUndefined();
    expect(paused.currentItemId).toBe('noct');
  });

  it('finishing closes the open segment', () => {
    const finished = finishSession(startItem(session(), 'noct', 0), 4 * MIN);
    expect(finished.status).toBe('finished');
    expect(runningItem(finished)).toBeUndefined();
    expect(sessionSeconds(finished, 99 * MIN)).toBe(4 * 60);
  });
});

describe('navigation between items', () => {
  it('follows the plan order across sections', () => {
    const s = session();
    expect(currentItemId(s)).toBe('scales');
    expect(neighborItemId(s, 'scales', 1)).toBe('noct');
    expect(neighborItemId(s, 'noct', 1)).toBe('clair');
    expect(neighborItemId(s, 'clair', 1)).toBeUndefined();
    expect(neighborItemId(s, 'scales', -1)).toBeUndefined();
  });

  it('falls back to the first item if the remembered one is gone', () => {
    expect(currentItemId(session({ currentItemId: 'deleted' }))).toBe('scales');
  });
});

describe('editing items', () => {
  it('logs entries with an optional BPM', () => {
    let s = logEntry(
      session(),
      'noct',
      { method: 'Slow practice', bpm: 60, note: 'bars 13–16' },
      7,
    );
    s = logEntry(s, 'noct', { method: 'Metronome', note: '' }, 8);
    const entries = s.sections[1].items[0].entries;
    expect(entries.map((e) => [e.method, e.bpm, e.at])).toEqual([
      ['Slow practice', 60, 7],
      ['Metronome', undefined, 8],
    ]);
    expect(entries[1]).not.toHaveProperty('bpm');
    expect(s.lastActivityAt).toBe(8);
  });

  it('corrects an item’s total time without touching its segments', () => {
    const s = pause(startItem(session(), 'noct', 0), 10 * MIN);
    const item = s.sections[1].items[0];
    const corrected = setItemSeconds(item, 25 * 60, 99 * MIN);
    expect(itemSeconds(corrected, 99 * MIN)).toBe(25 * 60);
    expect(corrected.segments).toEqual(item.segments);
  });

  it('removing the running item stops the timer and shows the next item', () => {
    const s = removeSessionItem(startItem(session(), 'noct', 0), 'noct', MIN);
    expect(runningItem(s)).toBeUndefined();
    expect(currentItemId(s)).toBe('clair');
    expect(sessionIndexes(s.sections).pieceIds).toEqual(['p2']);
  });
});

describe('forgottenTimer', () => {
  it('flags an item 30 minutes past its budget without activity', () => {
    const s = startItem(session(), 'clair', 0); // 15 min budget
    expect(forgottenTimer(s, 40 * MIN)).toBeNull();
    expect(forgottenTimer(s, 46 * MIN)).toEqual({
      itemId: 'clair',
      lastActivityAt: 0,
      suggestedSeconds: 15 * 60,
    });
  });

  it('flags an item without budget after an hour without activity', () => {
    let s = startItem(session(), 'noct', 0);
    s = logEntry(s, 'noct', { method: 'Metronome', note: '' }, 20 * MIN);
    expect(forgottenTimer(s, 70 * MIN)).toBeNull();
    expect(forgottenTimer(s, 81 * MIN)).toEqual({
      itemId: 'noct',
      lastActivityAt: 20 * MIN,
      suggestedSeconds: 20 * 60,
    });
  });

  it('ignores paused sessions', () => {
    expect(forgottenTimer(pause(startItem(session(), 'noct', 0), MIN), 999 * MIN)).toBeNull();
  });
});

describe('changeBudget', () => {
  it('sets, changes and removes an item’s budget', () => {
    let sections = changeBudget(plan(), 'noct', (m) => m + 5);
    expect(sections[1].items[0].budgetMinutes).toBe(5);
    sections = changeBudget(sections, 'noct', (m) => m - 5);
    expect(sections[1].items[0]).not.toHaveProperty('budgetMinutes');
  });
});
