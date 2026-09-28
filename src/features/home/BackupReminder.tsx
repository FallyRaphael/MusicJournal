import { differenceInCalendarDays } from 'date-fns';
import { Download, ShieldAlert } from 'lucide-react';
import { useHasData } from '../../db/backup';
import { updateSettings, useSettings } from '../../db/settings';
import { backupDue } from '../../domain/backup';
import { exportBackup } from '../../lib/backupFile';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import styles from './BackupReminder.module.css';

const SNOOZE_DAYS = 3;

interface BackupReminderProps {
  now: number;
  onBackedUp: (fileName: string) => void;
}

/** Reminds to back up when the last backup is two weeks old (or there never was one). */
export function BackupReminder({ now, onBackedUp }: BackupReminderProps) {
  const settings = useSettings();
  const hasData = useHasData();

  // createdAt is 0 only for the placeholder shown while settings load.
  if (hasData === undefined || settings.createdAt === 0) return null;
  const due = backupDue({
    hasData,
    lastBackupAt: settings.lastBackupAt,
    dataSince: settings.createdAt,
    snoozedUntil: settings.backupReminderSnoozedUntil,
    now,
  });
  if (!due) return null;

  return (
    <Card aria-labelledby="backup-reminder-title">
      <div className={styles.top}>
        <ShieldAlert size={22} className={styles.icon} aria-hidden="true" />
        <div className={styles.text}>
          <h2 id="backup-reminder-title" className={styles.title}>
            Time for a backup
          </h2>
          <p className={styles.muted}>
            {settings.lastBackupAt
              ? `Your last backup was ${differenceInCalendarDays(now, settings.lastBackupAt)} days ago.`
              : 'You haven’t made a backup yet.'}{' '}
            Your data lives only on this phone.
          </p>
        </div>
      </div>
      <div className={styles.buttons}>
        <Button
          variant="primary"
          icon={<Download size={18} aria-hidden="true" />}
          onClick={() => void exportBackup().then(onBackedUp)}
        >
          Back up now
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            void updateSettings({ backupReminderSnoozedUntil: now + SNOOZE_DAYS * 86_400_000 })
          }
        >
          Later
        </Button>
      </div>
    </Card>
  );
}
