import { idiv, remEuclid } from './math.js';

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Number of days in month `m` (1-12) of proleptic Gregorian year `y`. Returns 0 for an invalid month. */
export function daysInMonth(y: number, m: number): number {
  switch (m) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeap(y) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Converts a proleptic Gregorian civil date to a day number (days since
 * 1970-01-01, negative before it). Implements Howard Hinnant's
 * `days_from_civil` algorithm.
 */
export function daysFromCivil(y0: number, m: number, d: number): number {
  const y = m <= 2 ? y0 - 1 : y0;
  const eraBase = y >= 0 ? y : y - 399;
  const era = idiv(eraBase, 400);
  const yoe = y - era * 400;
  const doyMp = m > 2 ? m - 3 : m + 9;
  const doy = idiv(153 * doyMp + 2, 5) + d - 1;
  const doe = yoe * 365 + idiv(yoe, 4) - idiv(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * Converts a day number (days since 1970-01-01) back to a proleptic
 * Gregorian `[year, month, day]` civil date. Inverse of {@link daysFromCivil}.
 */
export function civilFromDays(z0: number): [number, number, number] {
  const z = z0 + 719468;
  const eraBase = z >= 0 ? z : z - 146096;
  const era = idiv(eraBase, 146097);
  const doe = z - era * 146097;
  const yoe = idiv(doe - idiv(doe, 1460) + idiv(doe, 36524) - idiv(doe, 146096), 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + idiv(yoe, 4) - idiv(yoe, 100));
  const mp = idiv(5 * doy + 2, 153);
  const d = doy - idiv(153 * mp + 2, 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const yAdj = m <= 2 ? y + 1 : y;
  return [yAdj, m, d];
}

/** Day of week for a day number: 0 = Sunday .. 6 = Saturday. */
export function weekday(days: number): number {
  return remEuclid(days + 4, 7);
}

/** The current local calendar date, as a day number (days since 1970-01-01). */
export function today(): number {
  const now = new Date();
  return daysFromCivil(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Weekday abbreviations, indexed as in {@link weekday} (0 = Sun). */
export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
/** Month abbreviations, 1-indexed (index 0 is an unused placeholder). */
export const MON = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Formats a day number as `"Wed 25 Jun"`. */
export function fmtWdDm(days: number): string {
  const [, m, d] = civilFromDays(days);
  return `${WD[weekday(days)]} ${d} ${MON[m]}`;
}

/** Formats a day number as `"Wed 25 Jun 2026"`. */
export function fmtWdDmy(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${WD[weekday(days)]} ${d} ${MON[m]} ${y}`;
}

/** Formats a day number as `"25 Jun 2026"`. */
export function fmtDmy(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${d} ${MON[m]} ${y}`;
}

/** Formats a day number as zero-padded ISO 8601 `"2026-06-25"`. */
export function fmtIso(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Formats a `[start, end]` day-number span as a compact human-readable
 * range, collapsing shared context: same day -> `"25 Jun"`, same month ->
 * `"25–28 Jun"`, same year -> `"29 Jun–5 Jul"`, otherwise both years are
 * spelled out in full.
 */
export function fmtRange(start: number, end: number): string {
  const [sy, sm, sd] = civilFromDays(start);
  const [ey, em, ed] = civilFromDays(end);
  if (sy !== ey) {
    return `${sd} ${MON[sm]} ${sy}–${ed} ${MON[em]} ${ey}`;
  }
  if (start === end) {
    return `${sd} ${MON[sm]}`;
  }
  if (sm === em) {
    return `${sd}–${ed} ${MON[sm]}`;
  }
  return `${sd} ${MON[sm]}–${ed} ${MON[em]}`;
}
