import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  /** Id of the control the label belongs to. */
  htmlFor?: string;
  children: ReactNode;
}

/** A labelled form row. Use it directly for custom controls, or via TextInput/TextArea. */
export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}

/** A labelled group of several controls (chips, radio buttons, …). */
export function FieldGroup({ label, hint, children }: Omit<FieldProps, 'htmlFor'>) {
  return (
    <fieldset className={`${styles.field} ${styles.group}`}>
      <legend className={styles.label}>{label}</legend>
      {children}
      {hint && <div className={styles.hint}>{hint}</div>}
    </fieldset>
  );
}

/** A bare text input with the standard styling. */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[styles.input, className].filter(Boolean).join(' ')} {...rest} />;
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function TextInput({ label, hint, id, ...rest }: TextInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} hint={hint} htmlFor={inputId}>
      <Input id={inputId} {...rest} />
    </Field>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
}

export function TextArea({ label, hint, id, className, ...rest }: TextAreaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} hint={hint} htmlFor={inputId}>
      <textarea
        id={inputId}
        className={[styles.input, styles.textarea, className].filter(Boolean).join(' ')}
        {...rest}
      />
    </Field>
  );
}
