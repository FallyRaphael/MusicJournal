import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  /** Stretch to the full width of the container. */
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block && styles.block, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, since the button shows only an icon. */
  label: string;
  variant?: 'plain' | 'outline';
}

export function IconButton({
  label,
  variant = 'plain',
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) {
  const classes = [styles.iconButton, styles[variant], className].filter(Boolean).join(' ');
  return (
    <button type={type} aria-label={label} className={classes} {...rest}>
      {children}
    </button>
  );
}
