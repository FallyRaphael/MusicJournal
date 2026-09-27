import { Ellipsis, House, Music, Target, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import styles from './TabBar.module.css';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/pieces', label: 'Pieces', icon: Music },
  { to: '/cycle', label: 'Cycle', icon: Target },
  { to: '/more', label: 'More', icon: Ellipsis },
];

export function TabBar() {
  return (
    <nav aria-label="Main" className={styles.bar}>
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <span className={styles.indicator}>
            <Icon size={22} aria-hidden="true" />
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
