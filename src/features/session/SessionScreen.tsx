import { Timer, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { IconButton } from '../../ui/Button';
import { EmptyState } from '../../ui/Screen';
import styles from './SessionScreen.module.css';

/** Full-screen practice mode, shown without the tab bar. The timer arrives in step 3. */
export function SessionScreen() {
  const navigate = useNavigate();
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <IconButton label="Close session" onClick={() => navigate('/')}>
          <X size={22} />
        </IconButton>
      </header>
      <EmptyState icon={<Timer size={24} aria-hidden="true" />} title="Practice session">
        The session screen with the timer is built in step 3.
      </EmptyState>
    </div>
  );
}
