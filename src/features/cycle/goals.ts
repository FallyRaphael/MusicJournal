import type { GoalProgress } from '../../domain/cycles';
import type { Goal, GoalKind } from '../../domain/model';

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  bpm: 'Tempo',
  time: 'Practice time',
  check: 'Done or not',
};

/** "45 min", "8 h", "1 h 30 min" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** What the goal asks for, e.g. "Tempo 72 → 96 BPM". */
export function goalDescription(goal: Goal): string {
  switch (goal.kind) {
    case 'bpm':
      return `Tempo ${goal.fromBpm ?? '?'} → ${goal.toBpm ?? '?'} BPM`;
    case 'time':
      return `Practice ${formatMinutes(goal.targetMinutes ?? 0)}`;
    case 'check':
      return goal.label || 'Tick off when done';
  }
}

/** Where the goal stands, e.g. "84 / 96 BPM". */
export function goalValue(goal: Goal, progress: GoalProgress): string {
  switch (goal.kind) {
    case 'bpm':
      return `${progress.current ?? '–'} / ${goal.toBpm ?? '?'} BPM`;
    case 'time':
      return `${formatMinutes(progress.current ?? 0)} / ${formatMinutes(goal.targetMinutes ?? 0)}`;
    case 'check':
      return progress.reached ? 'Done' : 'Open';
  }
}
