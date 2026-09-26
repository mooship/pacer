import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DayPickerCalendarProps {
  selected?: Date;
  defaultMonth?: Date;
  startMonth?: Date;
  disabled?: { before: Date };
  onSelect: (date: Date | undefined) => void;
}

/**
 * Thin wrapper around `react-day-picker`'s `DayPicker`, split into its own
 * module so `DatePopover` can lazy-load it — the calendar library is only
 * needed once a user opens the popover, not on first paint.
 */
export function DayPickerCalendar({
  selected,
  defaultMonth,
  startMonth,
  disabled,
  onSelect,
}: DayPickerCalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      defaultMonth={defaultMonth}
      startMonth={startMonth}
      disabled={disabled}
      onSelect={onSelect}
    />
  );
}
