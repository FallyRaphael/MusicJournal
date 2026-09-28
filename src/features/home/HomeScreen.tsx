import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, ChevronRight, Play, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useCycles } from '../../db/cycles';
import { db } from '../../db/database';
import { useFinishedSessions, usePlannedSessions, useRunningSession } from '../../db/sessions';
import { useSettings } from '../../db/settings';
import { useTemplates } from '../../db/templates';
import { openCycle, weekStreak } from '../../domain/cycles';
import { fromDateKey, toDateKey, weekDays } from '../../domain/dates';
import type { Session } from '../../domain/model';
import { currentItemId, findItem, runningItem, sessionSeconds } from '../../domain/session';
import { summarizeWeek } from '../../domain/week';
import { formatClock, formatDayLabel, formatLongDate } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { PageHeader, Screen } from '../../ui/Screen';
import { useLookups, type Lookups } from '../session/lookups';
import { SessionRow } from '../session/SessionsScreen';
import {
  emptySession,
  planSummary,
  QUICK_START,
  sessionFromTemplate,
  sessionLike,
} from '../session/starters';
import { BackupReminder } from './BackupReminder';
import { CycleCard, FocusCard } from './HomeCards';
import styles from './HomeScreen.module.css';
import { StartSheet } from './StartSheet';
import { WeekCard } from './WeekCard';

interface HomeState {
  /** A one-off message, e.g. after saving a session. */
  toast?: string;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings();
  const lookups = useLookups();
  const running = useRunningSession();
  const planned = usePlannedSessions();
  const finished = useFinishedSessions();
  const templates = useTemplates();
  const cycles = useCycles();
  const [startOpen, setStartOpen] = useState(false);

  const nowMs = useNow(running ? 1000 : 60_000);
  const now = new Date(nowMs);
  const today = toDateKey(now);
  const days = weekDays(now);
  const [first, last] = [days[0], days[6]];
  const weekSessions =
    useLiveQuery(
      () => db.sessions.where('date').between(first, last, true, true).toArray(),
      [first, last],
    ) ?? [];

  const toast = (location.state as HomeState | null)?.toast;
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => void navigate(location.pathname, { replace: true, state: null }),
      5000,
    );
    return () => clearTimeout(timer);
  }, [toast, navigate, location.pathname]);

  const open = (session: Session, quickStart = false) =>
    void navigate(`/sessions/${session.id}`, quickStart ? { state: QUICK_START } : undefined);
  const plan = (session: Session) => void navigate(`/sessions/${session.id}/plan`);

  const lastSession = finished?.[0];
  const quickTemplates = (templates ?? []).slice(0, 3);
  const tomorrow = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  return (
    <Screen>
      <PageHeader eyebrow={formatLongDate(now)} title="Practice" />

      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
          <IconButton
            label="Dismiss"
            onClick={() => void navigate(location.pathname, { replace: true, state: null })}
          >
            <X size={18} />
          </IconButton>
        </div>
      )}

      <BackupReminder
        now={nowMs}
        onBackedUp={(name) =>
          void navigate(location.pathname, {
            replace: true,
            state: { toast: `Backup saved: ${name}` },
          })
        }
      />

      {running && lookups.loaded && <RunningCard session={running} lookups={lookups} now={nowMs} />}

      <WeekCard
        days={days}
        today={today}
        summary={summarizeWeek(weekSessions, days)}
        target={settings.weeklyTarget}
        streak={weekStreak(finished ?? [], settings.weeklyTarget, now)}
      />

      {!running && (
        <div className={styles.start}>
          <Button
            variant="primary"
            size="lg"
            block
            icon={<Play size={20} fill="currentColor" aria-hidden="true" />}
            onClick={() => setStartOpen(true)}
          >
            Start session
          </Button>
          {(quickTemplates.length > 0 || lastSession) && (
            <div className={styles.quick}>
              {quickTemplates.map((template) => (
                <Button
                  key={template.id}
                  onClick={() =>
                    void sessionFromTemplate(template, today).then((s) => open(s, true))
                  }
                >
                  {template.name}
                </Button>
              ))}
              {lastSession && (
                <Button
                  onClick={() => void sessionLike(lastSession, today).then((s) => open(s, true))}
                >
                  Repeat last
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {planned && planned.length > 0 && (
        <Card aria-labelledby="planned-title">
          <h2 id="planned-title" className={styles.cardTitle}>
            <CalendarClock size={16} aria-hidden="true" />
            Planned
          </h2>
          <ul className={styles.planned}>
            {planned.map((session) => (
              <li key={session.id} className={styles.plannedRow}>
                <button type="button" className={styles.plannedText} onClick={() => plan(session)}>
                  <span className={styles.plannedDay}>
                    {formatDayLabel(fromDateKey(session.date), now)}
                    {session.name ? ` · ${session.name}` : ''}
                  </span>
                  <span className={styles.muted}>{planSummary(session.sections)}</span>
                </button>
                {!running && (
                  <Button variant="soft" onClick={() => open(session)}>
                    Start
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {cycles && lookups.loaded && (
        <>
          <CycleCard cycle={openCycle(cycles)} lookups={lookups} now={nowMs} />
          <FocusCard cycle={openCycle(cycles)} lookups={lookups} />
        </>
      )}

      {finished && finished.length > 0 && lookups.loaded && (
        <section className={styles.recent} aria-labelledby="recent-title">
          <div className={styles.recentHeader}>
            <h2 id="recent-title" className={styles.cardTitle}>
              Recent sessions
            </h2>
            <Link to="/sessions" className={styles.allLink}>
              All sessions
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.recentList}>
            {finished.slice(0, 3).map((session) => (
              <li key={session.id}>
                <SessionRow session={session} lookups={lookups} now={nowMs} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <StartSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        templates={templates ?? []}
        lastSession={lastSession}
        now={now}
        onTemplate={(template) =>
          void sessionFromTemplate(template, today).then((s) => open(s, true))
        }
        onRepeat={(session) => void sessionLike(session, today).then((s) => open(s, true))}
        onEmpty={() => void emptySession(today).then(plan)}
        onPlanLater={() => void emptySession(tomorrow).then(plan)}
        onLogPast={() => void navigate('/sessions/log')}
      />
    </Screen>
  );
}

/** The session in progress: what's on, how long so far, and a way back to it. */
function RunningCard({
  session,
  lookups,
  now,
}: {
  session: Session;
  lookups: Lookups;
  now: number;
}) {
  const id = currentItemId(session);
  const item = id ? findItem(session, id) : undefined;
  const isRunning = runningItem(session) !== undefined;
  return (
    <Link to={`/sessions/${session.id}`} className={styles.running}>
      <span className={styles.runningText}>
        <span className={styles.runningLabel}>
          {isRunning ? 'Practicing now' : 'Session paused'}
        </span>
        {item && (
          <span className={styles.runningItem}>
            <NoBreakKeys text={lookups.info(item.ref).title} />
          </span>
        )}
      </span>
      <span className={`${styles.runningTime} tabular`}>
        {formatClock(sessionSeconds(session, now))}
      </span>
      <span className={styles.resume}>Resume</span>
    </Link>
  );
}
