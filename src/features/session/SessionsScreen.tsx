import { ChevronRight, History, PenLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useFinishedSessions, useRunningSession } from '../../db/sessions';
import type { Session } from '../../domain/model';
import { sessionTime } from '../../domain/pieceStats';
import { planItems, sessionSeconds } from '../../domain/session';
import { formatDayLabel, formatDuration, formatMonthLong } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { useLookups, type Lookups } from './lookups';
import styles from './SessionsScreen.module.css';

/** All finished sessions, newest first, grouped by month. */
export function SessionsScreen() {
  const navigate = useNavigate();
  const sessions = useFinishedSessions();
  const running = useRunningSession();
  const lookups = useLookups();
  const now = useNow();

  if (sessions === undefined || !lookups.loaded) return null;

  const months = new Map<string, Session[]>();
  for (const session of sessions) {
    const month = formatMonthLong(sessionTime(session));
    months.set(month, [...(months.get(month) ?? []), session]);
  }

  return (
    <Screen>
      <BackButton label="Back" fallback="/more" />
      <PageHeader title="Sessions" />
      <Button
        icon={<PenLine size={18} aria-hidden="true" />}
        onClick={() => navigate('/sessions/log')}
      >
        Log a past session
      </Button>

      {running && <SessionRow session={running} lookups={lookups} now={now} label="In progress" />}

      {sessions.length === 0 ? (
        <EmptyState icon={<History size={24} aria-hidden="true" />} title="No sessions yet">
          Finished sessions show up here, with their time, entries and notes.
        </EmptyState>
      ) : (
        [...months].map(([month, list]) => (
          <section key={month} className={styles.month}>
            <h2 className={styles.monthTitle}>{month}</h2>
            <ul className={styles.list}>
              {list.map((session) => (
                <li key={session.id}>
                  <SessionRow session={session} lookups={lookups} now={now} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Screen>
  );
}

interface SessionRowProps {
  session: Session;
  lookups: Lookups;
  now: number;
  label?: string;
}

export function SessionRow({ session, lookups, now, label }: SessionRowProps) {
  const titles = planItems(session.sections).map(({ item }) => lookups.info(item.ref).title);
  return (
    <Link to={`/sessions/${session.id}`} className={styles.row}>
      <span className={styles.rowMain}>
        <span className={styles.rowHead}>
          <span className={styles.rowDay}>
            {label ?? formatDayLabel(new Date(sessionTime(session)), new Date(now))}
            {session.name ? ` · ${session.name}` : ''}
          </span>
          <span className="tabular">{formatDuration(sessionSeconds(session, now))}</span>
        </span>
        {titles.length > 0 && (
          <span className={styles.rowItems}>
            {titles.slice(0, 3).join(' · ')}
            {titles.length > 3 ? ` +${titles.length - 3}` : ''}
          </span>
        )}
      </span>
      <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
    </Link>
  );
}
