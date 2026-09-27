import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Target } from 'lucide-react';
import { useNavigate } from 'react-router';
import { db } from '../../db/database';
import { useSettings } from '../../db/settings';
import { toDateKey, weekDays } from '../../domain/dates';
import { summarizeWeek } from '../../domain/week';
import { formatLongDate } from '../../lib/format';
import { Button } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { WeekCard } from './WeekCard';

export function HomeScreen() {
  const navigate = useNavigate();
  const settings = useSettings();

  const now = new Date();
  const today = toDateKey(now);
  const days = weekDays(now);
  const [first, last] = [days[0], days[6]];
  const sessions =
    useLiveQuery(
      () => db.sessions.where('date').between(first, last, true, true).toArray(),
      [first, last],
    ) ?? [];

  return (
    <Screen>
      <PageHeader eyebrow={formatLongDate(now)} title="Practice" />
      <WeekCard
        days={days}
        today={today}
        summary={summarizeWeek(sessions, days)}
        target={settings.weeklyTarget}
      />
      <Button
        variant="primary"
        size="lg"
        block
        icon={<Play size={20} fill="currentColor" aria-hidden="true" />}
        onClick={() => navigate('/session')}
      >
        Start session
      </Button>
      <EmptyState icon={<Target size={24} aria-hidden="true" />} title="No active cycle">
        Plan the coming weeks with goals for your pieces and technique.
      </EmptyState>
    </Screen>
  );
}
