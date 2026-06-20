import { daysFromCivil, daysInMonth } from './date.js';
import { err, ok, type Result } from './result.js';

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

export function parseDateDays(s: string): Result<number> {
  const r = parseDate(s);
  if (!r.ok) {
    return r;
  }
  const [y, m, d] = r.value;
  return ok(daysFromCivil(y, m, d));
}

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
  return parseDateDays(t);
}

export function parseAmount(s: string): Result<number> {
  let t = s.trim();
  if (t.startsWith('R') || t.startsWith('r')) {
    t = t.slice(1).replace(/^\s+/, '');
  }
  const dot = t.indexOf('.');
  const intRaw = dot === -1 ? t : t.slice(0, dot);
  const fracRaw = dot === -1 ? null : t.slice(dot + 1);

  const intClean = intRaw.replace(/[,_ ]/g, '');
  if (!isAsciiDigits(intClean)) {
    return err(`amount must be a number of Rand, got \`${s}\``);
  }
  const rand = parseIntStrict(intClean);
  if (rand === null) {
    return err(`amount is too large, got \`${s}\``);
  }

  let cents = 0;
  if (fracRaw !== null) {
    if (fracRaw.length === 0 || fracRaw.length > 2 || !isAsciiDigits(fracRaw)) {
      return err(`amount can have at most 2 decimal places, got \`${s}\``);
    }
    cents = Number(fracRaw.padEnd(2, '0'));
  }

  const scaled = rand * 100;
  if (!Number.isSafeInteger(scaled)) {
    return err(`amount is too large, got \`${s}\``);
  }
  const total = checkedAdd(scaled, cents);
  if (total === null) {
    return err(`amount is too large, got \`${s}\``);
  }
  if (total <= 0) {
    return err('amount must be positive');
  }
  return ok(total);
}
