import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../ui/Button';
import styles from './UpdatePrompt.module.css';

/**
 * Tells the user when a new app version is ready (or when the app first became
 * available offline). The update is only applied when the user taps "Update", and this
 * prompt is not shown on the session screen, so practice is never interrupted.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>
        {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
      </span>
      {needRefresh && (
        <Button variant="soft" onClick={() => void updateServiceWorker()}>
          Update
        </Button>
      )}
      <Button variant="ghost" onClick={dismiss}>
        {needRefresh ? 'Later' : 'OK'}
      </Button>
    </div>
  );
}
