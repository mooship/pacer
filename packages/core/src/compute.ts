import { type Config, DEFAULT_CURRENCY } from './config.js';
import { currencyDigits, FORMAT_LOCALE, formatterFor } from './currency.js';
import { weekday } from './date.js';
import { idiv, remEuclid } from './math.js';
import { err, ok, type Result } from './result.js';

/**
 * The output of {@link compute}: parallel arrays, one entry per payout —
 * index 0 is the initial bridge payment, the rest are recurring payouts.
 */
export interface ComputeResult {
  /** Day number each payout lands on. */
  dates: number[];
  /** Number of days each payout's amount is meant to cover. */
  segDays: number[];
  /** Minor-units amount of each payout. */
  amounts: number[];
}

/** Last day number covered by a segment starting on `date` and spanning `days`. */
export function coverEnd(date: number, days: number): number {
  return date + days - 1;
}

/** Amount per day for a segment (truncating division); 0 for a zero-length segment. */
export function perDay(amount: number, days: number): number {
  return days > 0 ? idiv(amount, days) : 0;
}

/**
 * Formats a minor-units amount as currency-symbol-prefixed text for
 * `currency` (e.g. `"$12.34"`). If `currency` isn't a recognized ISO 4217
 * code, it's treated as a literal string prefix instead of erroring.
 */
export function fmtMoney(units: number, currency: string = DEFAULT_CURRENCY): string {
  const formatter = formatterFor(currency);
  if (formatter) {
    return formatter.format(units / 10 ** currencyDigits(currency));
  }
  // Not a real ISO 4217 code: treat it as a literal prefix, the same way
  // this function behaved before it grew currency-aware formatting.
  const neg = units < 0;
  return `${neg ? '-' : ''}${currency}${fmtAmount(Math.abs(units), currency)}`;
}

/** Formats a minor-units amount as a plain number (no currency symbol), at `currency`'s decimal precision. */
export function fmtAmount(units: number, currency: string = DEFAULT_CURRENCY): string {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(FORMAT_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(units / 10 ** digits);
}

/** Index of the payout whose coverage span includes `today`, or `null` if none does. */
export function currentSegment(result: ComputeResult, today: number): number | null {
  const { dates, segDays } = result;
  for (let i = 0; i < dates.length; i++) {
    if (today >= dates[i] && today <= coverEnd(dates[i], segDays[i])) {
      return i;
    }
  }
  return null;
}

/** Days from `today` until the next payout strictly after `today`, or `null` if there isn't one. */
export function nextPayout(result: ComputeResult, today: number): number | null {
  for (const date of result.dates) {
    if (date > today) {
      return date - today;
    }
  }
  return null;
}

/** Each amount as a fraction (0-1) of the largest, for sizing the results bar chart's rows. */
export function barFractions(amounts: number[]): number[] {
  const max = Math.max(...amounts, 1);
  return amounts.map((a) => a / max);
}

/**
 * Splits `quanta` whole units across `weights` (one per segment) in
 * proportion to `weights[i] / totalWeight`, using the largest-remainder
 * method so the per-segment shares are integers that sum exactly to `quanta`.
 */
function distribute(quanta: number, weights: number[], totalWeight: number): number[] {
  const base = weights.map((w) => idiv(w * quanta, totalWeight));
  const fracs = weights.map((w, i): [number, number] => [(w * quanta) % totalWeight, i]);
  let leftover = quanta - base.reduce((a, b) => a + b, 0);
  fracs.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of fracs) {
    if (leftover === 0) {
      break;
    }
    base[i] += 1;
    leftover -= 1;
  }
  return base;
}

/**
 * Builds a payout schedule from `pay` (start day) to `end` (last covered
 * day) that splits `total` minor units into an initial bridge payment plus
 * recurring payouts on `cfg.payday`, spaced `cfg.interval` days apart.
 *
 * If `pay` already falls on `cfg.payday`, the first recurring payout is
 * pushed a full `cfg.interval` days out (never same-day as the bridge);
 * otherwise it lands on the next occurrence of `cfg.payday`. `total` is
 * split into `quanta = idiv(total, cfg.quantum)` whole units, distributed
 * across every segment by day-count (largest-remainder method), then the
 * bridge's share is peeled back out and the remainder redistributed among
 * only the recurring payouts — so those stay exact multiples of
 * `cfg.quantum` among themselves, while the bridge absorbs whatever total
 * doesn't evenly divide.
 *
 * Fails if `end` is before `pay`.
 */
export function compute(
  pay: number,
  end: number,
  total: number,
  cfg: Config,
): Result<ComputeResult> {
  if (end < pay) {
    return err('end must be on or after pay');
  }

  const totalDays = end - pay + 1;

  const dates = [pay];
  const offset = remEuclid(cfg.payday - weekday(pay), 7);
  const toFirst = offset === 0 ? cfg.interval : offset;
  let m = pay + toFirst;
  while (m <= end) {
    dates.push(m);
    m += cfg.interval;
  }

  const n = dates.length;
  const segDays = dates.map((_, i) => {
    const next = i + 1 < n ? dates[i + 1] : end + 1;
    return next - dates[i];
  });

  // Distribute across every segment first just to read off the bridge's share
  // (index 0); that share is subtracted out so recurring installments are
  // redistributed among themselves and stay exact multiples of quantum, while
  // the bridge absorbs whatever quantum can't evenly cover.
  const quanta = idiv(total, cfg.quantum);
  const firstQuanta = distribute(quanta, segDays, totalDays)[0];
  const weeklyQuanta = quanta - firstQuanta;

  const amounts = new Array<number>(n).fill(0);
  if (n > 1) {
    const weeklyDays = totalDays - segDays[0];
    const weekly = distribute(weeklyQuanta, segDays.slice(1), weeklyDays);
    weekly.forEach((q, i) => {
      amounts[i + 1] = q * cfg.quantum;
    });
  }
  amounts[0] = total - amounts.slice(1).reduce((a, b) => a + b, 0);

  return ok({ dates, segDays, amounts });
}
