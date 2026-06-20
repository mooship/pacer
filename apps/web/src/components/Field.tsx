import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import type { HTMLInputTypeAttribute } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  status: 'active' | 'done' | 'idle';
  placeholder?: string;
  hint?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  type?: HTMLInputTypeAttribute;
  autoFocus?: boolean;
}

export function Field({
  id,
  label,
  value,
  onChange,
  status,
  placeholder,
  hint,
  inputMode = 'text',
  type = 'text',
  autoFocus = false,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const showHint = Boolean(hint);
  return (
    <div className={clsx(styles.field, styles[status])}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {status === 'done' ? <Check className={styles.check} size={16} aria-hidden /> : null}
      </label>
      <input
        id={id}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={status !== 'active'}
        inputMode={inputMode}
        type={type}
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: focus follows the active wizard step
        autoFocus={autoFocus}
        aria-describedby={showHint ? hintId : undefined}
      />
      <p id={hintId} className={styles.hint} aria-live="polite">
        {hint ?? ' '}
      </p>
    </div>
  );
}
