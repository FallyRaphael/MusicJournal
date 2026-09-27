import type { ReactNode } from 'react';
import styles from './Screen.module.css';

/** Page container for the tab screens: gutters, vertical rhythm and a readable max width. */
export function Screen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  /** Small line above the title, e.g. today's date. */
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.emptyIcon}>{icon}</span>}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {children && <p className={styles.emptyText}>{children}</p>}
    </div>
  );
}
