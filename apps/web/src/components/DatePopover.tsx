import { daysFromCivil, fmtIso, parseDate } from '@pacer/core';
import { Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './Field.module.css';

/** Parses a `YYYY-MM-DD` field value into a local `Date` for `react-day-picker`, or `undefined` if invalid. */
function parseIso(value: string): Date | undefined {
  const r = parseDate(value);
  if (!r.ok) return undefined;
  const [y, m, d] = r.value;
  return new Date(y, m - 1, d);
}

/** Formats a `react-day-picker` selection back to the `YYYY-MM-DD` field format. */
function toIso(date: Date): string {
  return fmtIso(daysFromCivil(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

interface DatePopoverProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  onPicked?: () => void;
}

/**
 * A calendar-icon button that opens a `react-day-picker` popover for
 * picking a date into a {@link Field}. Closes on outside pointerdown or
 * Escape (refocusing the trigger button), or when a date is picked.
 */
export function DatePopover({ label, value, onChange, min, onPicked }: DatePopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
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
    <span className={styles.calendarWrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.calendarButton}
        onClick={() => setOpen((o) => !o)}
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
                onPicked?.();
              }
            }}
          />
        </div>
      ) : null}
    </span>
  );
}
