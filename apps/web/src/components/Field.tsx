import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { type HTMLInputTypeAttribute, useRef } from 'react';
import { DatePopover } from './DatePopover.js';
import styles from './Field.module.css';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  status: 'active' | 'done' | 'idle';
  placeholder?: string;
  hint?: string;
  invalid?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  type?: HTMLInputTypeAttribute;
  autoFocus?: boolean;
  datePicker?: boolean;
  min?: string;
}

export function Field({
  id,
  label,
  value,
  onChange,
  status,
  placeholder,
  hint,
  invalid = false,
  inputMode = 'text',
  type = 'text',
  autoFocus = false,
  datePicker = false,
  min,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const showHint = Boolean(hint);
  const active = status === 'active';
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={clsx(styles.field, styles[status], invalid && styles.invalidField)}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {status === 'done' ? <Check className={styles.check} size={16} aria-hidden /> : null}
      </label>
      <div className={styles.row}>
        <input
          id={id}
          ref={inputRef}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={!active}
          inputMode={inputMode}
          type={type}
          autoComplete="off"
          // biome-ignore lint/a11y/noAutofocus: focus follows the active wizard step
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={showHint ? hintId : undefined}
        />
        {datePicker ? (
          <DatePopover
            label={label}
            value={value}
            onChange={onChange}
            active={active}
            min={min}
            onPicked={() => inputRef.current?.focus()}
          />
        ) : null}
      </div>
      <p id={hintId} className={clsx(styles.hint, invalid && styles.hintError)} aria-live="polite">
        {hint ?? ' '}
      </p>
    </div>
  );
}
