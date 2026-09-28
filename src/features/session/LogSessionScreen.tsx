import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createSession } from '../../db/sessions';
import { fromDateKey, toDateKey } from '../../domain/dates';
import type { SessionSection } from '../../domain/model';
import { newSessionItem, sessionSeconds, updatePlanItem } from '../../domain/session';
import { formatDuration, formatLongDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { Button, IconButton } from '../../ui/Button';
import { TextArea, TextInput } from '../../ui/Field';
import { useLookups } from './lookups';
import { PlanEditor, SpentControl } from './PlanEditor';
import styles from './PlanScreen.module.css';

/** Records a session after the fact: what was practiced and for how long. */
export function LogSessionScreen() {
  const navigate = useNavigate();
  const goBack = useGoBack('/');
  const lookups = useLookups();
  const [today] = useState(() => toDateKey(new Date()));
  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sections, setSections] = useState<SessionSection[]>([]);
  const [saving, setSaving] = useState(false);

  // Logged items have no timed segments, so the time doesn't depend on "now".
  const total = sessionSeconds({ sections }, 0);

  const save = async () => {
    setSaving(true);
    const session = await createSession({
      date,
      status: 'finished',
      ...(name.trim() ? { name: name.trim() } : {}),
      sections,
      note: note.trim(),
    });
    void navigate(`/sessions/${session.id}`, { replace: true });
  };

  if (!lookups.loaded) return null;

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <IconButton label="Cancel" onClick={goBack}>
          <X size={22} />
        </IconButton>
        <h1 className={styles.heading}>Log a past session</h1>
        <span />
      </header>

      <main className={styles.content}>
        <div className={styles.fields}>
          <TextInput
            label="Date"
            type="date"
            value={date}
            max={today}
            hint={date ? formatLongDate(fromDateKey(date)) : undefined}
            onChange={(event) => setDate(event.target.value)}
          />
          <TextInput
            label="Name (optional)"
            placeholder="e.g. Lesson"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <PlanEditor
          sections={sections}
          lookups={lookups}
          createItem={(ref) => newSessionItem(ref)}
          onChange={(update) => setSections((current) => update(current))}
          emptyText="Add what you practiced, then enter the minutes for each item."
          timeControl={(item) => (
            <SpentControl
              seconds={item.adjustSeconds}
              onChange={(seconds) =>
                setSections((current) =>
                  updatePlanItem(current, item.id, (i) => ({ ...i, adjustSeconds: seconds })),
                )
              }
            />
          )}
        />

        <TextArea
          label="Session note"
          rows={3}
          value={note}
          placeholder="How did it go?"
          onChange={(event) => setNote(event.target.value)}
        />
      </main>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          disabled={saving || total === 0 || !date}
          onClick={() => void save()}
        >
          {total > 0 ? `Save · ${formatDuration(total)}` : 'Save'}
        </Button>
      </footer>
    </div>
  );
}
