import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Chip.module.css';

interface ToggleChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}

/** A pill-shaped on/off button, e.g. for filter options. */
export function ToggleChip({ pressed, onChange, className, children, ...rest }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={[styles.chip, pressed && styles.pressed, className].filter(Boolean).join(' ')}
      onClick={() => onChange(!pressed)}
      {...rest}
    >
      {children}
    </button>
  );
}

type PillTone = 'neutral' | 'accent' | 'outline' | 'focus';

/** A small non-interactive label, e.g. a status or tag. */
export function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}

/** Wraps chips or pills onto several lines. */
export function ChipRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
