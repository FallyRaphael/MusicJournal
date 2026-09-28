import { RotateCw, TriangleAlert } from 'lucide-react';
import { useRouteError } from 'react-router';
import { Button } from '../ui/Button';
import { EmptyState, Screen } from '../ui/Screen';
import styles from './RouteError.module.css';

/** Shown instead of a screen that crashed. The data itself is untouched in the database. */
export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Screen>
      <EmptyState
        icon={<TriangleAlert size={24} aria-hidden="true" />}
        title="Something went wrong"
      >
        Your data is safe – it’s stored separately from this screen. Reloading usually helps.
      </EmptyState>
      <Button
        variant="primary"
        size="lg"
        block
        icon={<RotateCw size={18} aria-hidden="true" />}
        onClick={() => window.location.reload()}
      >
        Reload
      </Button>
      <details className={styles.details}>
        <summary>Technical details</summary>
        <pre className={styles.message}>{message}</pre>
      </details>
    </Screen>
  );
}
