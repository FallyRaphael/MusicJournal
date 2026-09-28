import { markBackedUp, readAllData } from '../db/backup';
import { backupFileName, createBackupFile } from '../domain/backup';
import { toDateKey } from '../domain/dates';

/** Offers a file for download (on Android it lands in the Downloads folder). */
export function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before releasing the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Saves all data as a backup file and remembers when. Returns the file name. */
export async function exportBackup(): Promise<string> {
  const now = new Date();
  const file = createBackupFile(await readAllData(), now.getTime());
  const name = backupFileName(toDateKey(now));
  downloadFile(name, JSON.stringify(file), 'application/json');
  await markBackedUp(now.getTime());
  return name;
}
