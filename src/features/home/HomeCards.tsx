import { ChevronRight, Flag, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useSessionsBetween } from '../../db/sessions';
import { cycleDay, cycleEnd, cyclePhase, cycleSessions, goalProgress } from '../../domain/cycles';
import { fromDateKey, toDateKey } from '../../domain/dates';
import type { Cycle, ItemRef } from '../../domain/model';
import { refKey } from '../../domain/refs';
import { formatDayInSentence } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { GoalRow } from '../cycle/GoalRow';
import type { Lookups } from '../session/lookups';
import styles from './HomeCards.module.css';

const GOALS_ON_HOME = 4;

interface CycleCardProps {
  cycle?: Cycle;
  lookups: Lookups;
  now: number;
}

/** The open cycle at a glance, or an invitation to plan one. */
export function CycleCard({ cycle, lookups, now }: CycleCardProps) {
  const navigate = useNavigate();
  if (!cycle) {
    return (
      <Card aria-labelledby="no-cycle-title">
        <div className={styles.emptyCycle}>
          <Target size={22} className={styles.emptyIcon} aria-hidden="true" />
          <div className={styles.emptyText}>
            <h2 id="no-cycle-title" className={styles.cardTitle}>
              No active cycle
            </h2>
            <p className={styles.muted}>Plan the coming weeks with goals for your pieces.</p>
          </div>
        </div>
        <Button onClick={() => navigate('/cycles/new')}>Plan a cycle</Button>
      </Card>
    );
  }
  return <OpenCycleCard cycle={cycle} lookups={lookups} now={now} />;
}

function OpenCycleCard({ cycle, lookups, now }: Required<CycleCardProps>) {
  const navigate = useNavigate();
  const end = cycleEnd(cycle);
  const sessions = cycleSessions(cycle, useSessionsBetween(cycle.startDate, end) ?? []);
  const today = toDateKey(new Date(now));
  const phase = cyclePhase(cycle, today);
  const day = cycleDay(cycle, today);

  const status =
    phase === 'upcoming'
      ? `Starts ${formatDayInSentence(fromDateKey(cycle.startDate), new Date(now))}`
      : phase === 'ended'
        ? 'Ended'
        : `Day ${day} of ${cycle.lengthDays}`;

  return (
    <Card aria-labelledby="cycle-title">
      <Link to="/cycle" className={styles.cycleHeader}>
        <span className={styles.cycleText}>
          <span className={styles.label}>Current cycle</span>
          <span id="cycle-title" className={styles.cycleName}>
            {cycle.name}
          </span>
        </span>
        <span className={styles.status}>{status}</span>
        <ChevronRight size={18} className={styles.muted} aria-hidden="true" />
      </Link>

      {phase === 'running' && (
        <span className={styles.daysBar} aria-hidden="true">
          <span style={{ width: `${(day / cycle.lengthDays) * 100}%` }} />
        </span>
      )}

      {phase === 'ended' && (
        <Button
          variant="primary"
          icon={<Flag size={18} aria-hidden="true" />}
          onClick={() => navigate(`/cycles/${cycle.id}/review`)}
        >
          Review cycle
        </Button>
      )}

      {cycle.goals.length === 0 ? (
        <p className={styles.muted}>No goals yet – add them on the Cycle tab.</p>
      ) : (
        <ul className={styles.goals}>
          {cycle.goals.slice(0, GOALS_ON_HOME).map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              title={lookups.info(goal.ref).title}
              progress={goalProgress(goal, sessions, now)}
            />
          ))}
        </ul>
      )}
      {cycle.goals.length > GOALS_ON_HOME && (
        <Link to="/cycle" className={styles.more}>
          All {cycle.goals.length} goals
        </Link>
      )}
    </Card>
  );
}

interface FocusCardProps {
  cycle?: Cycle;
  lookups: Lookups;
}

const MAX_FOCUS = 4;

/**
 * "Focus next time" notes to have in mind before practicing: first those of the cycle's
 * goals, then those of the pieces being learned.
 */
export function FocusCard({ cycle, lookups }: FocusCardProps) {
  const learning = lookups.pieces
    .filter((p) => p.status === 'learning')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((p): ItemRef => ({ kind: 'piece', pieceId: p.id }));
  const refs = [...(cycle?.goals.map((g) => g.ref) ?? []), ...learning];

  const seen = new Set<string>();
  const items = refs
    .filter((ref) => {
      const key = refKey(ref);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((ref) => ({ ref, info: lookups.info(ref) }))
    .filter(({ info }) => info.focusNote && !info.missing)
    .slice(0, MAX_FOCUS);

  if (items.length === 0) return null;

  return (
    <Card aria-labelledby="focus-title">
      <h2 id="focus-title" className={styles.cardTitle}>
        <Flag size={16} className={styles.focusIcon} aria-hidden="true" />
        Focus next time
      </h2>
      <ul className={styles.focusList}>
        {items.map(({ ref, info }) => (
          <li key={refKey(ref)}>
            <Link
              to={ref.kind === 'piece' ? `/pieces/${ref.pieceId}` : '/technique'}
              className={styles.focusRow}
            >
              <span className={styles.focusTitle}>
                <NoBreakKeys text={info.title} />
              </span>
              <span className={styles.focusNote}>{info.focusNote}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
