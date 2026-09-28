import { useEffect } from 'react';

/**
 * Keeps the screen on while `enabled`. The browser drops the lock when the app goes to
 * the background, so it is requested again when the app becomes visible.
 * Needs a secure context (HTTPS or localhost); elsewhere it quietly does nothing.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | undefined;
    let active = true;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (active) sentinel = lock;
        else void lock.release();
      } catch {
        // Refused, e.g. in battery saver mode. The screen may turn off; nothing breaks.
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release();
    };
  }, [enabled]);
}
