/** Tempo progress for a piece: the fastest tempo per session, and the chart's scale. */

import { cycleEnd } from './cycles';
import type { DateKey } from './dates';
import type { Cycle, Id, ItemRef, Session, Timestamp } from './model';
import { sessionTime, type RefMatcher } from './pieceStats';
import { sameRef } from './refs';

export interface TempoPoint {
  sessionId: Id;
  at: Timestamp;
  bpm: number;
  /** The method logged with that tempo. */
  method: string;
}

/** The fastest tempo logged for matching items in each practiced session, oldest first. */
export function tempoHistory(matches: RefMatcher, sessions: readonly Session[]): TempoPoint[] {
  const points: TempoPoint[] = [];
  for (const session of sessions) {
    if (session.status === 'planned') continue;
    let best: { bpm: number; method: string } | undefined;
    for (const section of session.sections) {
      for (const item of section.items) {
        if (!matches(item.ref)) continue;
        for (const entry of item.entries) {
          if (entry.bpm !== undefined && (!best || entry.bpm > best.bpm)) {
            best = { bpm: entry.bpm, method: entry.method };
          }
        }
      }
    }
    if (best) points.push({ sessionId: session.id, at: sessionTime(session), ...best });
  }
  return points.sort((a, b) => a.at - b.at);
}

/** The target tempo of a tempo goal for `ref` in the cycle running today, if there is one. */
export function runningTempoGoal(
  ref: ItemRef,
  cycles: readonly Cycle[],
  today: DateKey,
): number | undefined {
  const cycle = cycles.find(
    (c) => c.closedAt === undefined && c.startDate <= today && today <= cycleEnd(c),
  );
  return cycle?.goals.find((g) => g.kind === 'bpm' && sameRef(g.ref, ref) && g.toBpm)?.toBpm;
}

export interface TempoScale {
  min: number;
  max: number;
  /** Grid lines, lowest first. */
  ticks: number[];
}

/** A tempo axis with round limits and two to four grid lines, covering all values. */
export function tempoScale(values: readonly number[]): TempoScale {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = high - low <= 40 ? 10 : high - low <= 80 ? 20 : 40;
  const min = Math.floor((low - 2) / step) * step;
  const max = Math.ceil((high + 2) / step) * step;
  const ticks: number[] = [];
  for (let tick = min + step; tick < max; tick += step) ticks.push(tick);
  if (ticks.length === 0) ticks.push(min + step / 2);
  return { min, max, ticks };
}
