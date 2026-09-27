import { Minus, Plus } from 'lucide-react';
import { IconButton } from './Button';
import styles from './Stepper.module.css';

interface StepperProps {
  /** Accessible name of the value, e.g. "Weekly target". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  unit,
}: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <IconButton
        label={`Decrease ${label.toLowerCase()}`}
        variant="outline"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={20} />
      </IconButton>
      <output className={`${styles.value} tabular`} aria-live="polite">
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </output>
      <IconButton
        label={`Increase ${label.toLowerCase()}`}
        variant="outline"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus size={20} />
      </IconButton>
    </div>
  );
}
