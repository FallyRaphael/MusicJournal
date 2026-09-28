import { CircleCheck } from 'lucide-react';
import type { GoalProgress } from '../../domain/cycles';
import type { Goal } from '../../domain/model';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { goalDescription, goalValue } from './goals';
import styles from './GoalRow.module.css';

interface GoalRowProps {
  goal: Goal;
  /** The piece or technique item the goal is about. */
  title: string;
  /** Omit where progress doesn't apply yet (e.g. while planning a cycle). */
  progress?: GoalProgress;
  onEdit?: () => void;
  /** Ticks a check goal off; omit for a read-only view. */
  onToggle?: (done: boolean) => void;
}

export function GoalRow({ goal, title, progress, onEdit, onToggle }: GoalRowProps) {
  const reached = progress?.reached ?? false;
  const description = goalDescription(goal);
  const text = (
    <>
      <span className={styles.title}>
        <NoBreakKeys text={title} />
      </span>
      <span className={styles.description}>
        {description}
        {goal.label && goal.kind !== 'check' ? ` · ${goal.label}` : ''}
      </span>
    </>
  );

  return (
    <li className={styles.goal}>
      <div className={styles.top}>
        {goal.kind === 'check' && onToggle && (
          <input
            type="checkbox"
            className={styles.check}
            checked={goal.done}
            aria-label={`Done: ${description}`}
            onChange={(event) => onToggle(event.target.checked)}
          />
        )}
        {onEdit ? (
          <button type="button" className={styles.text} onClick={onEdit}>
            {text}
          </button>
        ) : (
          <span className={styles.text}>{text}</span>
        )}
        {progress && (
          <span className={reached ? `${styles.value} ${styles.reached}` : styles.value}>
            {reached && <CircleCheck size={16} aria-hidden="true" />}
            {goalValue(goal, progress)}
          </span>
        )}
      </div>
      {progress && goal.kind !== 'check' && (
        <span className={styles.bar} aria-hidden="true">
          <span
            className={reached ? `${styles.fill} ${styles.fillReached}` : styles.fill}
            style={{ width: `${progress.ratio * 100}%` }}
          />
        </span>
      )}
    </li>
  );
}
