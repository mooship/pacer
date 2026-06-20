import type { Config } from './config.js';
import { weekday } from './date.js';

const idiv = (a: number, b: number): number => Math.trunc(a / b);

export interface ComputeResult {
  dates: number[];
  segDays: number[];
  amounts: number[];
}

export function coverEnd(date: number, days: number): number {
  return date + days - 1;
}

export function perDay(amount: number, days: number): number {
  return idiv(amount, days);
}

export function fmtMoney(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const rand = idiv(abs, 100);
  const frac = abs % 100;
  const digits = rand.toString();
  const len = digits.length;
  let grouped = '';
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) {
      grouped += ',';
    }
    grouped += digits[i];
  }
  return `${neg ? '-' : ''}R${grouped}.${frac.toString().padStart(2, '0')}`;
}

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

export function compute(
  pay: number,
  end: number,
  total: number,
  boost: number,
  cfg: Config,
): ComputeResult {
  const totalDays = end - pay + 1;
  const clampedBoost = Math.min(Math.max(boost, 0), total);

  const dates = [pay];
  const offset = (((cfg.payday - weekday(pay)) % 7) + 7) % 7;
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

  const quanta = idiv(total, cfg.quantum);
  const bridgeQuanta = distribute(quanta, segDays, totalDays)[0];
  const weeklyQuanta = quanta - bridgeQuanta;
  const boostQuanta = Math.min(idiv(clampedBoost, cfg.quantum), weeklyQuanta);

  const amounts = new Array<number>(n).fill(0);
  if (n > 1) {
    const weeklyDays = totalDays - segDays[0];
    const weekly = distribute(weeklyQuanta - boostQuanta, segDays.slice(1), weeklyDays);
    weekly.forEach((q, i) => {
      amounts[i + 1] = q * cfg.quantum;
    });
  }
  amounts[0] = total - amounts.slice(1).reduce((a, b) => a + b, 0);

  return { dates, segDays, amounts };
}
