import { Check } from 'lucide-react';
import { fromDateKey, type DateKey } from '../../domain/dates';
import type { WeekSummary } from '../../domain/week';
import { formatWeekdayLetter } from '../../lib/format';
import { Card } from '../../ui/Card';
import styles from './WeekCard.module.css';

interface WeekCardProps {
  days: readonly DateKey[];
  today: DateKey;
  summary: WeekSummary;
  target: number;
  /** Consecutive weeks that met the target. */
  streak: number;
}

export function WeekCard({ days, today, summary, target, streak }: WeekCardProps) {
  return (
    <Card aria-labelledby="week-title">
      <div className={styles.header}>
        <h2 id="week-title" className={styles.title}>
          This week
        </h2>
        {streak > 0 && <span className={styles.streak}>{streak}-week streak</span>}
      </div>
      <div className={styles.body}>
        <p className={`${styles.count} tabular`}>
          {summary.sessionCount}
          <span className={styles.target}> / {target}</span>
          <span className="visually-hidden"> sessions</span>
        </p>
        <ol className={styles.days}>
          {days.map((day, i) => {
            const practiced = summary.practicedDays[i];
            const isToday = day === today;
            const letter = formatWeekdayLetter(fromDateKey(day));
            return (
              <li key={day} className={styles.day}>
                <span
                  className={[
                    styles.dot,
                    practiced && styles.practiced,
                    isToday && !practiced && styles.today,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {practiced && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span
                  className={isToday ? `${styles.letter} ${styles.todayLetter}` : styles.letter}
                >
                  {letter}
                </span>
                <span className="visually-hidden">{practiced ? 'practiced' : 'no practice'}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
