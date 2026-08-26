import { describe, expect, it } from 'vitest';
import {
  barFractions,
  type ComputeResult,
  compute,
  currentSegment,
  fmtAmount,
  fmtMoney,
  nextPayout,
  perDay,
} from './compute.js';
import { type Config, DEFAULT_QUANTUM, defaultConfig } from './config.js';
import { daysFromCivil, weekday } from './date.js';

const cfg = (): Config => defaultConfig();
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

function computeOk(...args: Parameters<typeof compute>): ComputeResult {
  const r = compute(...args);
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
}

describe('compute', () => {
  it('amounts sum to total', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = computeOk(pay, end, 500000, cfg());
    expect(sum(amounts)).toBe(500000);
  });

  it('weekly amounts are multiples of quantum', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = computeOk(pay, end, 500000, cfg());
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
  });

  it('sub-quantum remainder goes to first week', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = computeOk(pay, end, 502500, cfg());
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
    expect(sum(amounts)).toBe(502500);
  });

  it('first week is four days when pay is Thursday', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { dates, segDays } = computeOk(pay, end, 500000, cfg());
    expect(dates[0]).toBe(pay);
    expect(segDays[0]).toBe(4);
    expect(dates[1]).toBe(daysFromCivil(2026, 6, 29));
  });

  it('first week is seven days when pay is Monday', () => {
    const pay = daysFromCivil(2026, 6, 22);
    const end = daysFromCivil(2026, 7, 19);
    const { dates, segDays, amounts } = computeOk(pay, end, 400000, cfg());
    expect(dates[0]).toBe(pay);
    expect(segDays[0]).toBe(7);
    expect(dates[1]).toBe(pay + 7);
    expect(sum(amounts)).toBe(400000);
  });

  it('single day cycle', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const { dates, segDays, amounts } = computeOk(pay, pay, 100000, cfg());
    expect(dates.length).toBe(1);
    expect(segDays[0]).toBe(1);
    expect(sum(amounts)).toBe(100000);
  });

  it('fmtMoney groups thousands and cents for the default currency', () => {
    expect(fmtMoney(500000)).toBe('R 5,000.00');
    expect(fmtMoney(502550)).toBe('R 5,025.50');
    expect(fmtMoney(99)).toBe('R 0.99');
    expect(fmtMoney(1234567)).toBe('R 12,345.67');
  });

  it('fmtMoney formats other ISO currencies with their own symbol and decimals', () => {
    expect(fmtMoney(500000, 'USD')).toBe('$5,000.00');
    expect(fmtMoney(-1500, 'EUR')).toBe('-€15.00');
    expect(fmtMoney(1234, 'JPY')).toBe('¥1,234');
    expect(fmtMoney(1234500, 'KWD')).toBe('KWD 1,234.500');
  });

  it('fmtMoney falls back to a literal negative prefix for an unrecognized currency', () => {
    expect(fmtMoney(-500000, '$')).toBe('-$5,000.00');
  });

  it('fmtAmount formats a plain grouped number without a currency symbol', () => {
    expect(fmtAmount(500000)).toBe('5,000.00');
    expect(fmtAmount(1234, 'JPY')).toBe('1,234');
    expect(fmtAmount(1234500, 'KWD')).toBe('1,234.500');
  });

  it('currentSegment finds the segment covering a day, else null', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = computeOk(pay, end, 500000, cfg());
    expect(currentSegment(result, pay)).toBe(0);
    expect(currentSegment(result, result.dates[1])).toBe(1);
    expect(currentSegment(result, pay - 1)).toBeNull();
    expect(currentSegment(result, end + 1)).toBeNull();
  });

  it('nextPayout returns days to the upcoming payout, else null', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = computeOk(pay, end, 500000, cfg());
    expect(nextPayout(result, pay)).toBe(result.dates[1] - pay);
    expect(nextPayout(result, end)).toBeNull();
    expect(nextPayout(result, end + 1)).toBeNull();
  });

  it('nextPayout counts down to the pay date before the plan starts', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = computeOk(pay, end, 500000, cfg());
    expect(nextPayout(result, pay - 1)).toBe(1);
    expect(nextPayout(result, pay - 5)).toBe(5);
  });

  it('barFractions normalizes to the largest amount', () => {
    expect(barFractions([100, 50, 0])).toEqual([1, 0.5, 0]);
    expect(barFractions([0, 0])).toEqual([0, 0]);
  });

  it('first payout lands on configured weekday', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const friday: Config = { ...defaultConfig(), payday: 5 };
    const { dates } = computeOk(pay, end, 500000, friday);
    expect(dates[0]).toBe(pay);
    expect(weekday(dates[1])).toBe(5);
    expect(dates[1]).toBe(daysFromCivil(2026, 6, 26));
  });

  it('interval spaces payouts', () => {
    const pay = daysFromCivil(2026, 6, 22);
    const end = daysFromCivil(2026, 8, 31);
    const fortnightly: Config = { ...defaultConfig(), interval: 14 };
    const { dates, amounts } = computeOk(pay, end, 800000, fortnightly);
    expect(dates.length).toBeGreaterThanOrEqual(3);
    for (let i = 2; i < dates.length; i++) {
      expect(dates[i] - dates[i - 1]).toBe(14);
    }
    expect(sum(amounts)).toBe(800000);
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
  });

  it('custom quantum rounds weeklies', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const r100: Config = { ...defaultConfig(), quantum: 10000 };
    const { amounts } = computeOk(pay, end, 500000, r100);
    expect(sum(amounts)).toBe(500000);
    for (const a of amounts.slice(1)) {
      expect(a % 10000).toBe(0);
    }
  });

  it('rejects an end date before the pay date', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const r = compute(pay, pay - 1, 500000, cfg());
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/end must be on or after pay/);
  });

  it('holds up at the largest total parseAmount allows with a quantum of 1', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const maxCents = Math.floor(Number.MAX_SAFE_INTEGER / 366);
    const rand = Math.floor(maxCents / 100);
    const total = rand * 100;
    const oneCentQuantum: Config = { ...defaultConfig(), quantum: 1 };
    const { amounts } = computeOk(pay, end, total, oneCentQuantum);
    expect(sum(amounts)).toBe(total);
    expect(Number.isSafeInteger(sum(amounts))).toBe(true);
  });
});

describe('perDay', () => {
  it('returns 0 instead of dividing by a non-positive day count', () => {
    expect(perDay(1000, 0)).toBe(0);
    expect(perDay(1000, -5)).toBe(0);
  });

  it('divides normally for a positive day count', () => {
    expect(perDay(1000, 4)).toBe(250);
  });
});
