import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { createCycle, mutateCycle, useCycle, useCycles, type CycleDetails } from '../../db/cycles';
import { useRecentSessions } from '../../db/sessions';
import { cycleEnd, openCycle } from '../../domain/cycles';
import { fromDateKey, toDateKey } from '../../domain/dates';
import type { Goal, ItemRef } from '../../domain/model';
import { lastBpm } from '../../domain/pieceStats';
import { sameRef } from '../../domain/refs';
import { formatLongDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { Button, IconButton } from '../../ui/Button';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { FieldGroup, TextInput } from '../../ui/Field';
import { Stepper } from '../../ui/Stepper';
import { useLookups, type Lookups } from '../session/lookups';
import styles from '../session/PlanScreen.module.css';
import formStyles from './CycleFormScreen.module.css';
import { GoalRow } from './GoalRow';
import { GoalSheet } from './GoalSheet';

const LENGTHS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 28, label: '4 weeks' },
  { days: 42, label: '6 weeks' },
];

/** Passed from a cycle review to prefill the next cycle. */
export interface NextCycleState {
  name?: string;
  startDate?: string;
  lengthDays?: number;
  goals?: Goal[];
}

export function NewCycleScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const cycles = useCycles();
  const lookups = useLookups();
  const [today] = useState(() => toDateKey(new Date()));

  if (cycles === undefined || !lookups.loaded) return null;
  // Only one cycle at a time: finish (review) the open one first.
  if (openCycle(cycles)) return <Navigate to="/cycle" replace />;

  const next = (location.state as NextCycleState | null) ?? {};
  const initial: CycleDetails = {
    name: next.name ?? `Cycle ${cycles.length + 1}`,
    startDate: next.startDate && next.startDate > today ? next.startDate : today,
    lengthDays: next.lengthDays ?? 28,
    goals: next.goals ?? [],
  };

  return (
    <CycleForm
      heading="New cycle"
      submitLabel="Start cycle"
      initial={initial}
      lookups={lookups}
      showGoals
      onSubmit={async (details) => {
        await createCycle(details);
        void navigate('/cycle', { replace: true });
      }}
    />
  );
}

export function EditCycleScreen() {
  const { cycleId = '' } = useParams();
  const cycle = useCycle(cycleId);
  const lookups = useLookups();
  const goBack = useGoBack('/cycle');

  if (cycle === undefined || !lookups.loaded) return null;
  if (cycle === null) return <Navigate to="/cycle" replace />;

  return (
    <CycleForm
      heading="Edit cycle"
      submitLabel="Save"
      initial={cycle}
      lookups={lookups}
      onSubmit={async ({ name, startDate, lengthDays }) => {
        await mutateCycle(cycle.id, (c) => ({ ...c, name, startDate, lengthDays }));
        goBack();
      }}
    />
  );
}

interface CycleFormProps {
  heading: string;
  submitLabel: string;
  initial: CycleDetails;
  lookups: Lookups;
  /** New cycles set their first goals here; existing ones on the cycle screen. */
  showGoals?: boolean;
  onSubmit: (details: CycleDetails) => Promise<void>;
}

function CycleForm({
  heading,
  submitLabel,
  initial,
  lookups,
  showGoals,
  onSubmit,
}: CycleFormProps) {
  const goBack = useGoBack('/cycle');
  const recent = useRecentSessions();
  const [name, setName] = useState(initial.name);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [lengthDays, setLengthDays] = useState(initial.lengthDays);
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const [goalSheet, setGoalSheet] = useState<{ goal?: Goal } | null>(null);
  const [goalKey, setGoalKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const valid = name.trim() !== '' && startDate !== '' && lengthDays >= 1;
  const suggestBpm = (ref: ItemRef) => lastBpm((r) => sameRef(r, ref), recent ?? []);
  const openGoal = (goal?: Goal) => {
    setGoalKey((k) => k + 1);
    setGoalSheet({ goal });
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <IconButton label="Cancel" onClick={goBack}>
          <X size={22} />
        </IconButton>
        <h1 className={styles.heading}>{heading}</h1>
        <span />
      </header>

      <main className={styles.content}>
        <TextInput label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextInput
          label="Starts"
          type="date"
          value={startDate}
          hint={startDate ? formatLongDate(fromDateKey(startDate)) : undefined}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <FieldGroup
          label="Length"
          hint={
            startDate
              ? `Ends ${formatLongDate(fromDateKey(cycleEnd({ startDate, lengthDays })))}`
              : undefined
          }
        >
          <ChipRow>
            {LENGTHS.map(({ days, label }) => (
              <ToggleChip
                key={days}
                pressed={lengthDays === days}
                onChange={() => setLengthDays(days)}
              >
                {label}
              </ToggleChip>
            ))}
          </ChipRow>
          <div className={formStyles.days}>
            <span>Days</span>
            <Stepper
              label="Length in days"
              value={lengthDays}
              min={1}
              max={120}
              onChange={setLengthDays}
            />
          </div>
        </FieldGroup>

        {showGoals && (
          <FieldGroup label="Goals">
            {goals.length > 0 && (
              <ul className={formStyles.goals}>
                {goals.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    title={lookups.info(goal.ref).title}
                    onEdit={() => openGoal(goal)}
                  />
                ))}
              </ul>
            )}
            <Button icon={<Plus size={18} aria-hidden="true" />} onClick={() => openGoal()}>
              Add goal
            </Button>
          </FieldGroup>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          disabled={!valid || saving}
          onClick={() => {
            setSaving(true);
            void onSubmit({ name: name.trim(), startDate, lengthDays, goals });
          }}
        >
          {submitLabel}
        </Button>
      </footer>

      {goalSheet && (
        <GoalSheet
          key={goalKey}
          goal={goalSheet.goal}
          lookups={lookups}
          suggestBpm={suggestBpm}
          onClose={() => setGoalSheet(null)}
          onSave={(goal) => {
            setGoals((current) =>
              current.some((g) => g.id === goal.id)
                ? current.map((g) => (g.id === goal.id ? goal : g))
                : [...current, goal],
            );
            setGoalSheet(null);
          }}
          onDelete={
            goalSheet.goal
              ? () => {
                  const id = goalSheet.goal!.id;
                  setGoals((current) => current.filter((g) => g.id !== id));
                  setGoalSheet(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
