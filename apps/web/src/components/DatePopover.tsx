import { Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface DatePopoverProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  active: boolean;
  min?: string;
  onPicked?: () => void;
}

export function DatePopover({ label, value, onChange, active, min, onPicked }: DatePopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

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
                onPicked?.();
              }
            }}
          />
        </div>
      ) : null}
    </span>
  );
}
