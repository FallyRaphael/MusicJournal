import { useEffect, useState } from 'react';

/**
 * Whether the browser has promised not to clear the app's data when the device runs
 * low on space. Chrome decides on its own (it usually grants it to installed apps);
 * there is no permission prompt.
 */
export type StorageProtection = 'protected' | 'notProtected' | 'unsupported';

export async function requestPersistentStorage(): Promise<StorageProtection> {
  // `navigator.storage` is missing outside secure contexts (plain HTTP on the local network).
  const storage = navigator.storage as StorageManager | undefined;
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'protected';
    return (await storage.persist()) ? 'protected' : 'notProtected';
  } catch {
    return 'unsupported';
  }
}

export function useStorageProtection(): StorageProtection | undefined {
  const [protection, setProtection] = useState<StorageProtection>();
  useEffect(() => {
    let active = true;
    void requestPersistentStorage().then((result) => {
      if (active) setProtection(result);
    });
    return () => {
      active = false;
    };
  }, []);
  return protection;
}
