import { useState } from 'react';
import type { PieceStatus, ShelveOutcome } from '../../domain/model';
import { Button } from '../../ui/Button';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { ChoiceList } from '../../ui/ChoiceList';
import { FieldGroup } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import { OUTCOME_LABELS, STATUS_DESCRIPTIONS, STATUS_LABELS } from './labels';

const STATUSES = Object.keys(STATUS_LABELS) as PieceStatus[];
const OUTCOMES = Object.keys(OUTCOME_LABELS) as ShelveOutcome[];

interface StatusSheetProps {
  open: boolean;
  onClose: () => void;
  initialStatus: PieceStatus;
  initialOutcome?: ShelveOutcome;
  onSave: (status: PieceStatus, outcome?: ShelveOutcome) => void;
}

/** Mount with a `key` that changes on open, so the choices start from the given values. */
export function StatusSheet({
  open,
  onClose,
  initialStatus,
  initialOutcome,
  onSave,
}: StatusSheetProps) {
  const [status, setStatus] = useState(initialStatus);
  const [outcome, setOutcome] = useState(initialOutcome);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Change status"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onSave(status, status === 'shelved' ? outcome : undefined)}
          >
            Save
          </Button>
        </>
      }
    >
      <ChoiceList
        legend="Status"
        name="status"
        choices={STATUSES.map((value) => ({
          value,
          label: STATUS_LABELS[value],
          description: STATUS_DESCRIPTIONS[value],
        }))}
        value={status}
        onChange={setStatus}
      />
      {status === 'shelved' && (
        <FieldGroup label="How far did you get?" hint="Optional.">
          <ChipRow>
            {OUTCOMES.map((value) => (
              <ToggleChip
                key={value}
                pressed={outcome === value}
                onChange={(on) => setOutcome(on ? value : undefined)}
              >
                {OUTCOME_LABELS[value]}
              </ToggleChip>
            ))}
          </ChipRow>
        </FieldGroup>
      )}
    </Sheet>
  );
}
