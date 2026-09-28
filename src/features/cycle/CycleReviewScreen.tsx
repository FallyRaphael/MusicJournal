import { addDays } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { closeCycle, deleteCycle, useCycle } from '../../db/cycles';
import { useSessionsBetween } from '../../db/sessions';
import {
  carryOverGoal,
  cycleDay,
  cycleEnd,
  cycleSessions,
  cycleTime,
  goalProgress,
} from '../../domain/cycles';
import { fromDateKey, toDateKey } from '../../domain/dates';
import type { Cycle, Id, Session } from '../../domain/model';
import { refKey } from '../../domain/refs';
import { formatDuration, formatMediumDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { useNow } from '../../lib/useNow';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextArea } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { useLookups, type Lookups } from '../session/lookups';
import type { NextCycleState } from './CycleFormScreen';
import styles from './CycleReviewScreen.module.css';
import { goalDescription } from './goals';
import { GoalRow } from './GoalRow';

function useCycleData(cycleId: Id) {
  const cycle = useCycle(cycleId);
  const lookups = useLookups();
  const now = useNow();
  const start = cycle?.startDate ?? '';
  const end = cycle ? cycleEnd(cycle) : '';
  const sessions = useSessionsBetween(start, end);
  const ready = cycle !== undefined && sessions !== undefined && lookups.loaded;
  return {
    cycle,
    lookups,
    now,
    sessions: cycle && sessions ? cycleSessions(cycle, sessions) : [],
    ready,
  };
}

/** `/cycles/:id/review` – looks back on a cycle, then closes it. */
export function CycleReviewScreen() {
  const { cycleId = '' } = useParams();
  const { cycle, lookups, now, sessions, ready } = useCycleData(cycleId);
  if (!ready) return null;
  if (!cycle) return <Navigate to="/cycle" replace />;
  if (cycle.closedAt !== undefined) return <Navigate to={`/cycles/${cycle.id}`} replace />;
  return <Review cycle={cycle} lookups={lookups} sessions={sessions} now={now} />;
}

/** `/cycles/:id` – the summary of a reviewed cycle. */
export function CycleSummaryScreen() {
  const { cycleId = '' } = useParams();
  const goBack = useGoBack('/cycle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { cycle, lookups, now, sessions, ready } = useCycleData(cycleId);
  if (!ready) return null;
  if (!cycle || cycle.closedAt === undefined) return <Navigate to="/cycle" replace />;

  return (
    <Screen>
      <BackButton label="Cycle" fallback="/cycle" />
      <CycleReport cycle={cycle} lookups={lookups} sessions={sessions} now={now} />
      {cycle.reflection && (
        <Card aria-labelledby="reflection-title">
          <h2 id="reflection-title" className={styles.cardTitle}>
            Reflection
          </h2>
          <p className={styles.reflection}>{cycle.reflection}</p>
        </Card>
      )}
      <Button
        variant="ghost"
        className={styles.delete}
        icon={<Trash2 size={18} aria-hidden="true" />}
        onClick={() => setConfirmDelete(true)}
      >
        Delete cycle
      </Button>
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this cycle?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                goBack();
                void deleteCycle(cycle.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Its goals and reflection will be deleted. Your sessions stay.</p>
      </Sheet>
    </Screen>
  );
}

interface ReportProps {
  cycle: Cycle;
  lookups: Lookups;
  sessions: Session[];
  now: number;
}

/** Dates, time practiced, goal results and time per item of a cycle. */
function CycleReport({ cycle, lookups, sessions, now }: ReportProps) {
  const time = cycleTime(sessions, now);
  const progress = cycle.goals.map((goal) => goalProgress(goal, sessions, now));
  const reached = progress.filter((p) => p.reached).length;

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{cycle.name}</h1>
        <p className={styles.muted}>
          {formatMediumDate(fromDateKey(cycle.startDate))} –{' '}
          {formatMediumDate(fromDateKey(cycleEnd(cycle)))} · {cycle.lengthDays}{' '}
          {cycle.lengthDays === 1 ? 'day' : 'days'}
        </p>
      </header>

      <dl className={styles.stats}>
        <div>
          <dt>Practiced</dt>
          <dd className="tabular">{formatDuration(time.totalSeconds)}</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd className="tabular">{time.sessionCount}</dd>
        </div>
        <div>
          <dt>Days</dt>
          <dd className="tabular">
            {time.daysPracticed} / {cycle.lengthDays}
          </dd>
        </div>
      </dl>

      {cycle.goals.length > 0 && (
        <Card aria-labelledby="goals-title">
          <h2 id="goals-title" className={styles.cardTitle}>
            Goals · {reached} of {cycle.goals.length} reached
          </h2>
          <ul className={styles.list}>
            {cycle.goals.map((goal, i) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                title={lookups.info(goal.ref).title}
                progress={progress[i]}
              />
            ))}
          </ul>
        </Card>
      )}

      {time.byRef.length > 0 && (
        <Card aria-labelledby="time-title">
          <h2 id="time-title" className={styles.cardTitle}>
            Time per item
          </h2>
          <ul className={styles.byRef}>
            {time.byRef.map(({ ref, seconds }) => (
              <li key={refKey(ref)} className={styles.byRefRow}>
                <span>
                  <NoBreakKeys text={lookups.info(ref).title} />
                </span>
                <span className="tabular">{formatDuration(seconds)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Review({ cycle, lookups, sessions, now }: ReportProps) {
  const navigate = useNavigate();
  const [reflection, setReflection] = useState(cycle.reflection);
  const progress = cycle.goals.map((goal) => goalProgress(goal, sessions, now));
  // Unmet goals are carried over unless deselected.
  const [carry, setCarry] = useState<Id[]>(() =>
    cycle.goals.filter((_, i) => !progress[i].reached).map((g) => g.id),
  );
  const [saving, setSaving] = useState(false);

  const today = toDateKey(new Date(now));
  // Finished before its last day: the cycle ends today and the next one can start tomorrow.
  const early = today < cycleEnd(cycle);

  const finish = async (planNext: boolean) => {
    setSaving(true);
    await closeCycle(cycle.id, reflection.trim(), early ? cycleDay(cycle, today) : undefined);
    if (!planNext) {
      void navigate('/cycle', { replace: true });
      return;
    }
    const lastDay = early ? today : cycleEnd(cycle);
    const next: NextCycleState = {
      startDate: toDateKey(addDays(fromDateKey(lastDay), 1)),
      lengthDays: cycle.lengthDays,
      goals: cycle.goals
        .map((goal, i) => ({ goal, progress: progress[i] }))
        .filter(({ goal }) => carry.includes(goal.id))
        .map(({ goal, progress: p }) => carryOverGoal(goal, p)),
    };
    void navigate('/cycles/new', { replace: true, state: next });
  };

  const unmet = cycle.goals.filter((_, i) => !progress[i].reached);

  return (
    <Screen>
      <BackButton label="Cycle" fallback="/cycle" />
      <CycleReport cycle={cycle} lookups={lookups} sessions={sessions} now={now} />

      {unmet.length > 0 && (
        <Card aria-labelledby="carry-title">
          <h2 id="carry-title" className={styles.cardTitle}>
            Carry over to the next cycle
          </h2>
          <ul className={styles.list}>
            {unmet.map((goal) => (
              <li key={goal.id}>
                <label className={styles.carry}>
                  <input
                    type="checkbox"
                    checked={carry.includes(goal.id)}
                    onChange={(event) =>
                      setCarry((ids) =>
                        event.target.checked
                          ? [...ids, goal.id]
                          : ids.filter((id) => id !== goal.id),
                      )
                    }
                  />
                  <span className={styles.carryText}>
                    <span>
                      <NoBreakKeys text={lookups.info(goal.ref).title} />
                    </span>
                    <span className={styles.muted}>{goalDescription(goal)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className={styles.muted}>Tempo goals continue from the best tempo you reached.</p>
        </Card>
      )}

      <TextArea
        label="Reflection"
        rows={4}
        placeholder="What went well? What will you change?"
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
      />

      {early && (
        <p className={styles.muted}>
          Finishing early: the cycle will end today, after {cycleDay(cycle, today)} of{' '}
          {cycle.lengthDays} days.
        </p>
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={saving}
          onClick={() => void finish(true)}
        >
          Finish and plan the next cycle
        </Button>
        <Button block disabled={saving} onClick={() => void finish(false)}>
          Just finish
        </Button>
      </div>
    </Screen>
  );
}
