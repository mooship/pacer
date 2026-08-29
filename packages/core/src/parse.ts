import { MAX_DAYS } from './constants.js';
import { civilFromDays, daysFromCivil, daysInMonth } from './date.js';
import { err, ok, type Result } from './result.js';

// compute()'s largest-remainder distribution multiplies a per-segment weight
// (at most MAX_DAYS) by the quanta derived from this amount; bounding it here
// keeps that product within Number.MAX_SAFE_INTEGER even for a quantum of 1.
const MAX_AMOUNT = Math.floor(Number.MAX_SAFE_INTEGER / MAX_DAYS);

const isAsciiDigits = (s: string): boolean => s.length > 0 && /^[0-9]+$/.test(s);

function parseIntStrict(s: string): number | null {
  if (!/^[+-]?[0-9]+$/.test(s)) {
    return null;
  }
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

function checkedAdd(a: number, b: number): number | null {
  const sum = a + b;
  return Number.isSafeInteger(sum) ? sum : null;
}

/** Strictly parses `s` as a `YYYY-MM-DD` calendar date, validating the year/month/day ranges. */
export function parseDate(s: string): Result<[number, number, number]> {
  const p = s.split('-');
  if (p.length !== 3) {
    return err(`date must be YYYY-MM-DD, got \`${s}\``);
  }
  const y = parseIntStrict(p[0]);
  if (y === null) {
    return err(`bad year in \`${s}\``);
  }
  const m = parseIntStrict(p[1]);
  if (m === null) {
    return err(`bad month in \`${s}\``);
  }
  const d = parseIntStrict(p[2]);
  if (d === null) {
    return err(`bad day in \`${s}\``);
  }
  if (y < 1 || y > 9999) {
    return err(`year out of range in \`${s}\``);
  }
  if (m < 1 || m > 12) {
    return err(`month out of range in \`${s}\``);
  }
  if (d < 1 || d > daysInMonth(y, m)) {
    return err(`day out of range in \`${s}\``);
  }
  return ok([y, m, d]);
}

function parseDateDays(s: string): Result<number> {
  const r = parseDate(s);
  if (!r.ok) {
    return r;
  }
  const [y, m, d] = r.value;
  return ok(daysFromCivil(y, m, d));
}

// Gregorian leap years recur at least every 8 years (the longest gap, caused
// by the century rule), so searching that far forward always finds Feb 29.
const MAX_LEAP_GAP_YEARS = 8;

function resolveMonthDay(s: string, m: number, d: number, base: number): Result<number> {
  if (m < 1 || m > 12) {
    return err(`month out of range in \`${s}\``);
  }
  const maxDay = m === 2 ? 29 : daysInMonth(2000, m);
  if (d < 1 || d > maxDay) {
    return err(`day out of range in \`${s}\``);
  }
  const [baseYear] = civilFromDays(base);
  const inYear = (y: number): number | null =>
    d <= daysInMonth(y, m) ? daysFromCivil(y, m, d) : null;

  for (let offset = 0; offset <= MAX_LEAP_GAP_YEARS; offset++) {
    const days = inYear(baseYear + offset);
    if (days !== null && days >= base) {
      return ok(days);
    }
  }
  // Unreachable: MAX_LEAP_GAP_YEARS covers the longest possible gap between
  // Gregorian leap years, so the loop above always finds a match. Kept as a
  // safety net so this function always returns a Result.
  /* v8 ignore next */
  return err(`day out of range in \`${s}\``);
}

/**
 * Resolves a flexible date expression to a day number, relative to `base`
 * (a day number): blank or `"today"` -> `base`; `+N`/`-N` -> `base` offset by
 * N days; `MM-DD` -> the next occurrence of that month/day on or after
 * `base` (searching up to {@link MAX_LEAP_GAP_YEARS} years ahead so a Feb 29
 * `base` still resolves); a full `YYYY-MM-DD` -> that absolute date.
 */
export function resolveDate(s: string, base: number): Result<number> {
  const t = s.trim();
  if (t === '' || t.toLowerCase() === 'today') {
    return ok(base);
  }
  if (t.startsWith('+') || t.startsWith('-')) {
    const n = parseIntStrict(t);
    if (n === null) {
      return err(`bad day offset in \`${s}\``);
    }
    const sum = checkedAdd(base, n);
    if (sum === null) {
      return err(`day offset out of range in \`${s}\``);
    }
    return ok(sum);
  }
  const parts = t.split('-');
  if (parts.length === 2) {
    const m = parseIntStrict(parts[0]);
    if (m === null) {
      return err(`bad month in \`${s}\``);
    }
    const d = parseIntStrict(parts[1]);
    if (d === null) {
      return err(`bad day in \`${s}\``);
    }
    return resolveMonthDay(s, m, d, base);
  }
  return parseDateDays(t);
}

/**
 * Parses a money string (optional leading currency symbol, thousands
 * separators `,`/`_`/space, optional decimal part) into a positive integer
 * count of minor units. `digits` is the currency's decimal precision — pass
 * `currencyDigits(currency)` for the target currency; defaults to 2 (cents)
 * when omitted.
 */
export function parseAmount(s: string, digits = 2): Result<number> {
  let t = s.trim();
  const symbol = t.match(/^[^\d.\-+]+/);
  if (symbol) {
    t = t.slice(symbol[0].length).replace(/^\s+/, '');
  }
  const dot = t.indexOf('.');
  const intRaw = dot === -1 ? t : t.slice(0, dot);
  const fracRaw = dot === -1 ? null : t.slice(dot + 1);

  const intClean = intRaw.replace(/[,_ ]/g, '');
  if (!isAsciiDigits(intClean)) {
    return err(`amount must be a number, got \`${s}\``);
  }
  const whole = parseIntStrict(intClean);
  if (whole === null) {
    return err(`amount is too large, got \`${s}\``);
  }

  const scale = 10 ** digits;
  let frac = 0;
  if (fracRaw !== null) {
    if (fracRaw.length === 0 || fracRaw.length > digits || !isAsciiDigits(fracRaw)) {
      const noun = digits === 1 ? 'decimal place' : 'decimal places';
      return err(`amount can have at most ${digits} ${noun}, got \`${s}\``);
    }
    frac = Number(fracRaw.padEnd(digits, '0'));
  }

  const scaled = whole * scale;
  if (!Number.isSafeInteger(scaled)) {
    return err(`amount is too large, got \`${s}\``);
  }
  const total = checkedAdd(scaled, frac);
  if (total === null) {
    return err(`amount is too large, got \`${s}\``);
  }
  if (total <= 0) {
    return err('amount must be positive');
  }
  if (total > MAX_AMOUNT) {
    return err(`amount is too large, got \`${s}\``);
  }
  return ok(total);
}
