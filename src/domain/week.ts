import type { DateKey } from './dates';
import type { Session } from './model';

export interface WeekSummary {
  /** Finished sessions within the week. */
  sessionCount: number;
  /** One entry per day of the week: whether at least one session was finished that day. */
  practicedDays: boolean[];
}

/** Summarises which days of `days` had finished sessions. Unfinished sessions don't count. */
export function summarizeWeek(
  sessions: readonly Pick<Session, 'date' | 'status'>[],
  days: readonly DateKey[],
): WeekSummary {
  const finished = sessions.filter((s) => s.status === 'finished' && days.includes(s.date));
  const datesWithPractice = new Set(finished.map((s) => s.date));
  return {
    sessionCount: finished.length,
    practicedDays: days.map((day) => datesWithPractice.has(day)),
  };
}
