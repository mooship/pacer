import { idiv } from './math.js';

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

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

export function weekday(days: number): number {
  return ((((days % 7) + 4) % 7) + 7) % 7;
}

export function today(): number {
  const now = new Date();
  return daysFromCivil(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
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

export function fmtWdDm(days: number): string {
  const [, m, d] = civilFromDays(days);
  return `${WD[weekday(days)]} ${d} ${MON[m]}`;
}

export function fmtWdDmy(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${WD[weekday(days)]} ${d} ${MON[m]} ${y}`;
}

export function fmtDmy(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${d} ${MON[m]} ${y}`;
}

export function fmtIso(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`;
}

export function fmtRange(start: number, end: number): string {
  const [, sm, sd] = civilFromDays(start);
  const [, em, ed] = civilFromDays(end);
  if (start === end) {
    return `${sd} ${MON[sm]}`;
  }
  if (sm === em) {
    return `${sd}–${ed} ${MON[sm]}`;
  }
  return `${sd} ${MON[sm]}–${ed} ${MON[em]}`;
}
