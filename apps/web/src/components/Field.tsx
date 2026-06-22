import { clsx } from 'clsx';
import { Calendar, Check } from 'lucide-react';
import { type HTMLInputTypeAttribute, useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './Field.module.css';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parseIso(value: string): Date | undefined {
  if (!ISO.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIso(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : undefined;

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
          <span className={styles.calendarWrap} ref={wrapRef}>
            <button
              type="button"
              className={styles.calendarButton}
              onClick={() => setOpen((o) => !o)}
              disabled={!active}
              aria-label={`Pick ${label.toLowerCase()} from a calendar`}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <Calendar size={18} aria-hidden />
            </button>
            {open ? (
              <div className={styles.popover} role="dialog" aria-label={`${label} calendar`}>
                <DayPicker
                  mode="single"
                  selected={selected}
                  defaultMonth={selected ?? minDate}
                  startMonth={minDate}
                  disabled={minDate ? { before: minDate } : undefined}
                  onSelect={(date) => {
                    if (date) {
                      onChange(toIso(date));
                      setOpen(false);
                      inputRef.current?.focus();
                    }
                  }}
                />
              </div>
            ) : null}
          </span>
        ) : null}
      </div>
      <p id={hintId} className={clsx(styles.hint, invalid && styles.hintError)} aria-live="polite">
        {hint ?? ' '}
      </p>
    </div>
  );
}
