import { useEffect, useState } from 'react';
import { importData, readAllData, type ImportMode } from '../../db/backup';
import {
  hasChanges,
  mergeData,
  replaceSummary,
  type BackupData,
  type BackupFile,
} from '../../domain/backup';
import { formatMediumDate } from '../../lib/format';
import { Button } from '../../ui/Button';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Sheet } from '../../ui/Sheet';
import { changeLines, contentsLine } from './backupText';
import styles from './ImportSheet.module.css';

const MODES = [
  { value: 'merge', label: 'Merge' },
  { value: 'replace', label: 'Replace' },
] as const;

const timeOfDay = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

interface ImportSheetProps {
  file: BackupFile;
  onClose: () => void;
  /** Called after a successful import with a short message for the user. */
  onDone: (message: string) => void;
}

/** Shows what an import would change and imports on confirmation. */
export function ImportSheet({ file, onClose, onDone }: ImportSheetProps) {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [current, setCurrent] = useState<BackupData>();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    void readAllData().then((data) => {
      if (active) setCurrent(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const summary = current
    ? mode === 'merge'
      ? mergeData(current, file.data).summary
      : replaceSummary(current, file.data)
    : undefined;
  const nothingNew = summary !== undefined && !hasChanges(summary);
  const lines = summary ? changeLines(summary) : [];

  const run = async () => {
    setImporting(true);
    const merged = await importData(file.data, mode);
    const changes = merged ? changeLines(merged) : [];
    onDone(
      mode === 'replace'
        ? 'Backup restored.'
        : changes.length > 0
          ? `Backup merged – ${changes.join('; ').toLowerCase()}.`
          : 'Backup merged – nothing new.',
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Restore from backup"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={mode === 'replace' ? 'danger' : 'primary'}
            disabled={!current || importing || nothingNew}
            onClick={() => void run()}
          >
            {mode === 'replace' ? 'Replace my data' : 'Merge'}
          </Button>
        </>
      }
    >
      <div className={styles.file}>
        <span className={styles.fileTitle}>
          Backup from {formatMediumDate(file.exportedAt)}, {timeOfDay.format(file.exportedAt)}
        </span>
        <span className={styles.muted}>{contentsLine(file.data)}</span>
      </div>

      <SegmentedControl
        legend="How to import"
        name="import-mode"
        options={MODES}
        value={mode}
        onChange={setMode}
      />
      <p className={styles.muted}>
        {mode === 'merge'
          ? 'Adds what’s missing and keeps the newer version of anything changed in both places. Nothing you have now is lost.'
          : 'Everything currently in the app is replaced by the backup.'}
      </p>

      {current && (
        <section className={styles.preview} aria-label="What will change">
          <h3 className={styles.previewTitle}>What will change</h3>
          {nothingNew ? (
            <p>
              {mode === 'merge'
                ? 'Nothing – your data already contains everything in this backup.'
                : 'Nothing – the backup is the same as your current data.'}
            </p>
          ) : (
            <ul className={styles.lines}>
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className={styles.muted}>
        The app keeps a copy of your current data first, so you can undo the import under More.
      </p>
    </Sheet>
  );
}
