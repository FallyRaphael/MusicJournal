/**
 * Practice cycles: a block of days with goals. Everything about progress is derived from
 * the sessions practiced within the cycle's days – nothing here is stored.
 */

import { addDays, differenceInCalendarDays, startOfWeek } from 'date-fns';
import { fromDateKey, toDateKey, type DateKey } from './dates';
import { newId } from './ids';
import type { Cycle, Goal, ItemRef, Session, Timestamp } from './model';
import { sessionSummaries } from './pieceStats';
import { refKey, sameRef } from './refs';
import { itemSeconds } from './timer';

/* ---------- Dates ---------- */

/** The last day of a cycle. */
export function cycleEnd(cycle: Pick<Cycle, 'startDate' | 'lengthDays'>): DateKey {
  return toDateKey(addDays(fromDateKey(cycle.startDate), cycle.lengthDays - 1));
}

export type CyclePhase = 'upcoming' | 'running' | 'ended' | 'closed';

/** Upcoming, running, ended (waiting for its review) or closed (reviewed). */
export function cyclePhase(
  cycle: Pick<Cycle, 'startDate' | 'lengthDays' | 'closedAt'>,
  today: DateKey,
): CyclePhase {
  if (cycle.closedAt !== undefined) return 'closed';
  if (today < cycle.startDate) return 'upcoming';
  if (today > cycleEnd(cycle)) return 'ended';
  return 'running';
}

/** Which day of the cycle `today` is, from 1 to its length. */
export function cycleDay(cycle: Pick<Cycle, 'startDate' | 'lengthDays'>, today: DateKey): number {
  const day = differenceInCalendarDays(fromDateKey(today), fromDateKey(cycle.startDate)) + 1;
  return Math.min(cycle.lengthDays, Math.max(1, day));
}

/** The cycle that hasn't been reviewed yet (there is at most one), if any. */
export function openCycle(cycles: readonly Cycle[]): Cycle | undefined {
  return cycles
    .filter((c) => c.closedAt === undefined)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

/** Practiced (not just planned) sessions on the cycle's days. */
export function cycleSessions(
  cycle: Pick<Cycle, 'startDate' | 'lengthDays'>,
  sessions: readonly Session[],
): Session[] {
  const end = cycleEnd(cycle);
  return sessions.filter(
    (s) => s.status !== 'planned' && s.date >= cycle.startDate && s.date <= end,
  );
}

/* ---------- Goal progress ---------- */

export interface GoalProgress {
  /** 0 to 1. */
  ratio: number;
  reached: boolean;
  /** Best BPM (tempo goals) or minutes practiced (time goals). */
  current?: number;
}

/** The highest BPM logged for an item in the given sessions. */
export function bestBpm(ref: ItemRef, sessions: readonly Session[]): number | undefined {
  let best: number | undefined;
  for (const session of sessions) {
    for (const section of session.sections) {
      for (const item of section.items) {
        if (!sameRef(item.ref, ref)) continue;
        for (const entry of item.entries) {
          if (entry.bpm !== undefined && (best === undefined || entry.bpm > best)) best = entry.bpm;
        }
      }
    }
  }
  return best;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Progress of a goal from the sessions of its cycle (pass only those). */
export function goalProgress(
  goal: Goal,
  sessions: readonly Session[],
  now: Timestamp,
): GoalProgress {
  switch (goal.kind) {
    case 'check':
      return { ratio: goal.done ? 1 : 0, reached: goal.done };
    case 'time': {
      const seconds = sessionSummaries((ref) => sameRef(ref, goal.ref), sessions, now).reduce(
        (sum, s) => sum + s.seconds,
        0,
      );
      const minutes = Math.floor(seconds / 60);
      const target = goal.targetMinutes ?? 0;
      return {
        current: minutes,
        ratio: target > 0 ? clamp01(minutes / target) : 0,
        reached: target > 0 && minutes >= target,
      };
    }
    case 'bpm': {
      const best = bestBpm(goal.ref, sessions);
      const from = goal.fromBpm ?? 0;
      const to = goal.toBpm ?? 0;
      if (best === undefined) return { ratio: 0, reached: false };
      return {
        current: best,
        ratio: to > from ? clamp01((best - from) / (to - from)) : best >= to ? 1 : 0,
        reached: best >= to,
      };
    }
  }
}

/**
 * A goal for the next cycle: same target, not done yet; a tempo goal starts from the best
 * tempo reached so far.
 */
export function carryOverGoal(goal: Goal, progress: GoalProgress): Goal {
  const next: Goal = { ...goal, id: newId(), done: false };
  if (goal.kind === 'bpm' && progress.current !== undefined) {
    next.fromBpm = Math.max(goal.fromBpm ?? 0, progress.current);
  }
  return next;
}

/* ---------- Time in a cycle ---------- */

export interface RefTime {
  ref: ItemRef;
  seconds: number;
}

export interface CycleTime {
  totalSeconds: number;
  sessionCount: number;
  /** Days with at least one practiced session. */
  daysPracticed: number;
  /** Time per piece / technique item / free item, most first. */
  byRef: RefTime[];
}

export function cycleTime(sessions: readonly Session[], now: Timestamp): CycleTime {
  const byKey = new Map<string, RefTime>();
  let totalSeconds = 0;
  for (const session of sessions) {
    for (const section of session.sections) {
      for (const item of section.items) {
        const seconds = itemSeconds(item, now);
        totalSeconds += seconds;
        const key = refKey(item.ref);
        const entry = byKey.get(key) ?? { ref: item.ref, seconds: 0 };
        entry.seconds += seconds;
        byKey.set(key, entry);
      }
    }
  }
  return {
    totalSeconds,
    sessionCount: sessions.length,
    daysPracticed: new Set(sessions.map((s) => s.date)).size,
    byRef: [...byKey.values()].filter((r) => r.seconds > 0).sort((a, b) => b.seconds - a.seconds),
  };
}

/* ---------- Weekly streak ---------- */

/**
 * Consecutive weeks (Monday to Sunday) in which at least `weeklyTarget` sessions were
 * finished, counting back from the current week. The current week only counts once its
 * target is met – until then it doesn't break the streak either.
 */
export function weekStreak(
  sessions: readonly Pick<Session, 'date' | 'status'>[],
  weeklyTarget: number,
  today: Date,
): number {
  const perWeek = new Map<DateKey, number>();
  for (const session of sessions) {
    if (session.status !== 'finished') continue;
    const monday = toDateKey(startOfWeek(fromDateKey(session.date), { weekStartsOn: 1 }));
    perWeek.set(monday, (perWeek.get(monday) ?? 0) + 1);
  }
  const met = (monday: Date) => (perWeek.get(toDateKey(monday)) ?? 0) >= weeklyTarget;

  let monday = startOfWeek(today, { weekStartsOn: 1 });
  let streak = 0;
  if (met(monday)) streak = 1;
  monday = addDays(monday, -7);
  while (met(monday)) {
    streak += 1;
    monday = addDays(monday, -7);
  }
  return streak;
}
