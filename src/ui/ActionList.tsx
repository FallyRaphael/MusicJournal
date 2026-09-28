import type { ReactNode } from 'react';
import styles from './ActionList.module.css';

export interface Action {
  label: string;
  /** Optional second line, e.g. what the action will do. */
  description?: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

/** Full-width action rows, e.g. the options menu of a page. */
export function ActionList({ actions }: { actions: readonly Action[] }) {
  return (
    <ul className={styles.list}>
      {actions.map((action) => (
        <li key={action.label}>
          <button
            type="button"
            className={action.danger ? `${styles.action} ${styles.danger}` : styles.action}
            onClick={action.onSelect}
          >
            <span className={styles.icon}>{action.icon}</span>
            <span className={styles.text}>
              {action.label}
              {action.description && (
                <span className={styles.description}>{action.description}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
