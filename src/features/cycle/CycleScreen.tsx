import { ChevronRight, Ellipsis, Flag, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { deleteCycle, mutateCycle, useCycles } from '../../db/cycles';
import { useRecentSessions, useSessionsBetween } from '../../db/sessions';
import { fromDateKey, toDateKey } from '../../domain/dates';
import {
  cycleDay,
  cycleEnd,
  cyclePhase,
  cycleSessions,
  cycleTime,
  goalProgress,
  openCycle,
} from '../../domain/cycles';
import type { Cycle, Goal, ItemRef } from '../../domain/model';
import { lastBpm } from '../../domain/pieceStats';
import { refKey, sameRef } from '../../domain/refs';
import { formatDayInSentence, formatDuration, formatMediumDate } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { ActionList } from '../../ui/ActionList';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { useLookups, type Lookups } from '../session/lookups';
import styles from './CycleScreen.module.css';
import { GoalRow } from './GoalRow';
import { GoalSheet } from './GoalSheet';

export function CycleScreen() {
  const navigate = useNavigate();
  const cycles = useCycles();
  const lookups = useLookups();
  const now = useNow();

  if (cycles === undefined || !lookups.loaded) return null;
  const open = openCycle(cycles);
  const past = cycles.filter((c) => c.closedAt !== undefined);

  return (
    <Screen>
      {open ? (
        <OpenCycle cycle={open} lookups={lookups} now={now} />
      ) : (
        <>
          <PageHeader title="Cycle" />
          <EmptyState icon={<Target size={24} aria-hidden="true" />} title="No active cycle">
            A cycle is a block of days – say four weeks – with goals for specific pieces and
            technique. You review it at the end.
          </EmptyState>
          <Button variant="primary" size="lg" block onClick={() => navigate('/cycles/new')}>
            Plan a cycle
          </Button>
        </>
      )}

      {past.length > 0 && (
        <section className={styles.past} aria-labelledby="past-title">
          <h2 id="past-title" className={styles.sectionTitle}>
            Past cycles
          </h2>
          <ul className={styles.pastList}>
            {past.map((cycle) => (
              <li key={cycle.id}>
                <Link to={`/cycles/${cycle.id}`} className={styles.pastRow}>
                  <span className={styles.pastText}>
                    <span className={styles.pastName}>{cycle.name}</span>
                    <span className={styles.muted}>
                      {formatMediumDate(fromDateKey(cycle.startDate))} –{' '}
                      {formatMediumDate(fromDateKey(cycleEnd(cycle)))} · {cycle.goals.length}{' '}
                      {cycle.goals.length === 1 ? 'goal' : 'goals'}
                    </span>
                  </span>
                  <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}

type OpenSheet = { kind: 'menu' | 'delete' } | { kind: 'goal'; goal?: Goal };

function OpenCycle({ cycle, lookups, now }: { cycle: Cycle; lookups: Lookups; now: number }) {
  const navigate = useNavigate();
  const today = toDateKey(new Date(now));
  const end = cycleEnd(cycle);
  const sessions = cycleSessions(cycle, useSessionsBetween(cycle.startDate, end) ?? []);
  const recent = useRecentSessions();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const phase = cyclePhase(cycle, today);
  const day = cycleDay(cycle, today);
  const time = cycleTime(sessions, now);
  const open = (next: OpenSheet) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };
  const close = () => setSheet(null);
  const suggestBpm = (ref: ItemRef) => lastBpm((r) => sameRef(r, ref), recent ?? []);

  const saveGoal = (goal: Goal) => {
    void mutateCycle(cycle.id, (c) => ({
      ...c,
      goals: c.goals.some((g) => g.id === goal.id)
        ? c.goals.map((g) => (g.id === goal.id ? goal : g))
        : [...c.goals, goal],
    }));
    close();
  };

  const eyebrow =
    phase === 'upcoming'
      ? `Starts ${formatDayInSentence(fromDateKey(cycle.startDate), new Date(now))}`
      : phase === 'ended'
        ? `Ended ${formatDayInSentence(fromDateKey(end), new Date(now))}`
        : `Day ${day} of ${cycle.lengthDays}`;

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={cycle.name}
        actions={
          <IconButton label="Cycle options" onClick={() => open({ kind: 'menu' })}>
            <Ellipsis size={22} />
          </IconButton>
        }
      />

      {phase === 'ended' ? (
        <Card aria-label="Review">
          <p className={styles.reviewText}>
            This cycle is over. Look back at your goals and decide what comes next.
          </p>
          <Button
            variant="primary"
            icon={<Flag size={18} aria-hidden="true" />}
            onClick={() => navigate(`/cycles/${cycle.id}/review`)}
          >
            Review cycle
          </Button>
        </Card>
      ) : (
        phase === 'running' && (
          <div className={styles.days}>
            <span className={styles.daysBar} aria-hidden="true">
              <span style={{ width: `${(day / cycle.lengthDays) * 100}%` }} />
            </span>
            <span className={styles.muted}>
              {cycle.lengthDays - day === 0
                ? 'Last day'
                : `${cycle.lengthDays - day} ${cycle.lengthDays - day === 1 ? 'day' : 'days'} left · ends ${formatDayInSentence(fromDateKey(end), new Date(now))}`}
            </span>
          </div>
        )
      )}

      <Card aria-labelledby="goals-title">
        <div className={styles.cardHeader}>
          <h2 id="goals-title" className={styles.cardTitle}>
            Goals
          </h2>
          <IconButton label="Add goal" onClick={() => open({ kind: 'goal' })}>
            <Plus size={20} />
          </IconButton>
        </div>
        {cycle.goals.length === 0 ? (
          <p className={styles.muted}>
            No goals yet. Set a tempo, a practice time or something to tick off.
          </p>
        ) : (
          <ul className={styles.goals}>
            {cycle.goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                title={lookups.info(goal.ref).title}
                progress={goalProgress(goal, sessions, now)}
                onEdit={() => open({ kind: 'goal', goal })}
                onToggle={(done) =>
                  void mutateCycle(cycle.id, (c) => ({
                    ...c,
                    goals: c.goals.map((g) => (g.id === goal.id ? { ...g, done } : g)),
                  }))
                }
              />
            ))}
          </ul>
        )}
      </Card>

      {phase !== 'upcoming' && (
        <Card aria-labelledby="time-title">
          <h2 id="time-title" className={styles.cardTitle}>
            So far
          </h2>
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
              <dd className="tabular">{time.daysPracticed}</dd>
            </div>
          </dl>
          {time.byRef.length > 0 && (
            <ul className={styles.byRef}>
              {time.byRef.slice(0, 5).map(({ ref, seconds }) => (
                <li key={refKey(ref)} className={styles.byRefRow}>
                  <span className={styles.byRefTitle}>
                    <NoBreakKeys text={lookups.info(ref).title} />
                  </span>
                  <span className="tabular">{formatDuration(seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Sheet open={sheet?.kind === 'menu'} onClose={close} title={cycle.name}>
        <ActionList
          actions={[
            {
              label: 'Edit cycle',
              description: 'Name, start and length',
              icon: <Pencil size={20} />,
              onSelect: () => {
                close();
                void navigate(`/cycles/${cycle.id}/edit`);
              },
            },
            ...(phase === 'running'
              ? [
                  {
                    label: 'Finish early',
                    description: 'Review it now',
                    icon: <Flag size={20} />,
                    onSelect: () => {
                      close();
                      void navigate(`/cycles/${cycle.id}/review`);
                    },
                  },
                ]
              : []),
            {
              label: 'Delete cycle',
              icon: <Trash2 size={20} />,
              danger: true,
              onSelect: () => open({ kind: 'delete' }),
            },
          ]}
        />
      </Sheet>

      <Sheet
        open={sheet?.kind === 'delete'}
        onClose={close}
        title="Delete this cycle?"
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                close();
                void deleteCycle(cycle.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Its goals will be deleted. Your sessions and pieces stay as they are.</p>
      </Sheet>

      {sheet?.kind === 'goal' && (
        <GoalSheet
          key={sheetKey}
          goal={sheet.goal}
          lookups={lookups}
          suggestBpm={suggestBpm}
          onSave={saveGoal}
          onClose={close}
          onDelete={
            sheet.goal
              ? () => {
                  const id = sheet.goal!.id;
                  void mutateCycle(cycle.id, (c) => ({
                    ...c,
                    goals: c.goals.filter((g) => g.id !== id),
                  }));
                  close();
                }
              : undefined
          }
        />
      )}
    </>
  );
}
