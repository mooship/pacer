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
  complete?: boolean;
  placeholder?: string;
  hint?: string;
  invalid?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  type?: HTMLInputTypeAttribute;
  datePicker?: boolean;
  min?: string;
}

export function Field({
  id,
  label,
  value,
  onChange,
  complete = false,
  placeholder,
  hint,
  invalid = false,
  inputMode = 'text',
  type = 'text',
  datePicker = false,
  min,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const showHint = Boolean(hint);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={clsx(styles.field, complete && styles.complete, invalid && styles.invalidField)}
    >
      <label className={styles.label} htmlFor={id}>
        {label}
        {complete ? <Check className={styles.check} size={16} aria-hidden /> : null}
      </label>
      <div className={styles.row}>
        <input
          id={id}
          ref={inputRef}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          type={type}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={showHint ? hintId : undefined}
        />
        {datePicker ? (
          <DatePopover
            label={label}
            value={value}
            onChange={onChange}
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
