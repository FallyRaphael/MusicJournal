import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { undoLastImport, useLastImport } from '../../db/backup';
import { useSettings } from '../../db/settings';
import { parseBackupFile, type BackupFile } from '../../domain/backup';
import { exportBackup } from '../../lib/backupFile';
import { formatRelativeDay } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Sheet } from '../../ui/Sheet';
import styles from './BackupCard.module.css';
import { ImportSheet } from './ImportSheet';

const timeOfDay = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const when = (at: number) => `${formatRelativeDay(at).toLowerCase()}, ${timeOfDay.format(at)}`;

/** Back up to a file, restore from one, and undo the last restore. */
export function BackupCard() {
  const settings = useSettings();
  const lastImport = useLastImport();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<BackupFile | null>(null);
  const [importKey, setImportKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmUndo, setConfirmUndo] = useState(false);

  const backUp = async () => {
    const name = await exportBackup();
    setMessage(`Saved “${name}” to your downloads.`);
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still triggers
    if (!file) return;
    const parsed = parseBackupFile(await file.text());
    if (parsed.ok) {
      setImportKey((k) => k + 1);
      setIncoming(parsed.file);
    } else {
      setError(parsed.error);
    }
  };

  return (
    <Card aria-labelledby="backup-title">
      <h2 id="backup-title" className={styles.title}>
        Backup
      </h2>
      <p>
        Last backup:{' '}
        <strong>{settings.lastBackupAt ? when(settings.lastBackupAt) : 'never'}</strong>
      </p>
      <p className={styles.muted}>
        Your data lives only on this phone. A backup file keeps it safe if the phone is lost or
        reset – store it somewhere else, e.g. in Google Drive.
      </p>
      <div className={styles.buttons}>
        <Button
          variant="primary"
          icon={<Download size={18} aria-hidden="true" />}
          onClick={() => void backUp()}
        >
          Back up now
        </Button>
        <Button
          icon={<Upload size={18} aria-hidden="true" />}
          onClick={() => fileInput.current?.click()}
        >
          Restore from a backup…
        </Button>
        {lastImport && (
          <Button
            variant="ghost"
            icon={<RotateCcw size={18} aria-hidden="true" />}
            onClick={() => setConfirmUndo(true)}
          >
            Undo last import ({when(lastImport.takenAt)})
          </Button>
        )}
      </div>
      {/* No `accept` filter: some Android file pickers grey out .json files when one is set. */}
      <input
        ref={fileInput}
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void readFile(e)}
      />
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      {incoming && (
        <ImportSheet
          key={importKey}
          file={incoming}
          onClose={() => setIncoming(null)}
          onDone={(done) => {
            setIncoming(null);
            setMessage(done);
          }}
        />
      )}

      <Sheet open={error !== null} onClose={() => setError(null)} title="Can’t restore this file">
        <p>{error}</p>
        <p className={styles.muted}>Nothing was changed.</p>
      </Sheet>

      <Sheet
        open={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Undo the last import?"
        footer={
          <>
            <Button onClick={() => setConfirmUndo(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmUndo(false);
                void undoLastImport().then(() => setMessage('Import undone.'));
              }}
            >
              Undo import
            </Button>
          </>
        }
      >
        <p>
          Your data goes back to how it was {lastImport ? when(lastImport.takenAt) : ''}, before the
          import. Anything you changed since then is lost.
        </p>
      </Sheet>
    </Card>
  );
}
