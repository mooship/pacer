import { describe, expect, it } from 'vitest';
import { barFractions, compute, currentSegment, fmtMoney, nextPayout } from './compute.js';
import { type Config, DEFAULT_QUANTUM, defaultConfig } from './config.js';
import { daysFromCivil, weekday } from './date.js';

const cfg = (): Config => defaultConfig();
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('compute', () => {
  it('amounts sum to total', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = compute(pay, end, 500000, 0, cfg());
    expect(sum(amounts)).toBe(500000);
  });

  it('weekly amounts are multiples of quantum', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = compute(pay, end, 500000, 0, cfg());
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
  });

  it('sub-quantum remainder goes to bridge', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = compute(pay, end, 502500, 0, cfg());
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
    expect(sum(amounts)).toBe(502500);
  });

  it('boost goes to bridge', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const base = compute(pay, end, 500000, 0, cfg()).amounts;
    const boosted = compute(pay, end, 500000, 100000, cfg()).amounts;
    expect(boosted[0]).toBeGreaterThan(base[0]);
    expect(boosted[0] - base[0]).toBeLessThanOrEqual(100000);
    expect(sum(boosted.slice(1))).toBeLessThan(sum(base.slice(1)));
    expect(sum(boosted)).toBe(500000);
    for (const a of boosted.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
  });

  it('single quantum boost moves money', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const base = compute(pay, end, 500000, 0, cfg()).amounts;
    const step = compute(pay, end, 500000, DEFAULT_QUANTUM, cfg()).amounts;
    expect(sum(base.slice(1)) - sum(step.slice(1))).toBe(DEFAULT_QUANTUM);
    expect(step[0] - base[0]).toBe(DEFAULT_QUANTUM);
    expect(sum(step)).toBe(500000);
  });

  it('each boost step shifts one quantum', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    let prev = Number.NEGATIVE_INFINITY;
    for (let k = 0; k <= 20; k++) {
      const a = compute(pay, end, 500000, k * DEFAULT_QUANTUM, cfg()).amounts;
      expect(a[0]).toBeGreaterThanOrEqual(prev);
      if (k > 0) {
        expect(a[0] - prev).toBe(DEFAULT_QUANTUM);
      }
      prev = a[0];
      expect(sum(a)).toBe(500000);
    }
  });

  it('out of range boost is clamped', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const over = compute(pay, end, 500000, 900000, cfg()).amounts;
    const full = compute(pay, end, 500000, 500000, cfg()).amounts;
    expect(over).toEqual(full);
    expect(sum(over)).toBe(500000);
    expect(over.every((a) => a >= 0)).toBe(true);

    const under = compute(pay, end, 500000, -100000, cfg()).amounts;
    const zero = compute(pay, end, 500000, 0, cfg()).amounts;
    expect(under).toEqual(zero);
    expect(under.every((a) => a >= 0)).toBe(true);
  });

  it('boost preserves total and quantum', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { amounts } = compute(pay, end, 502500, 100000, cfg());
    expect(sum(amounts)).toBe(502500);
    for (const a of amounts.slice(1)) {
      expect(a % DEFAULT_QUANTUM).toBe(0);
    }
  });

  it('bridge is four days when pay is Thursday', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const { dates, segDays } = compute(pay, end, 500000, 0, cfg());
    expect(dates[0]).toBe(pay);
    expect(segDays[0]).toBe(4);
    expect(dates[1]).toBe(daysFromCivil(2026, 6, 29));
  });

  it('bridge is seven days when pay is Monday', () => {
    const pay = daysFromCivil(2026, 6, 22);
    const end = daysFromCivil(2026, 7, 19);
    const { dates, segDays, amounts } = compute(pay, end, 400000, 0, cfg());
    expect(dates[0]).toBe(pay);
    expect(segDays[0]).toBe(7);
    expect(dates[1]).toBe(pay + 7);
    expect(sum(amounts)).toBe(400000);
  });

  it('single day cycle', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const { dates, segDays, amounts } = compute(pay, pay, 100000, 0, cfg());
    expect(dates.length).toBe(1);
    expect(segDays[0]).toBe(1);
    expect(sum(amounts)).toBe(100000);
  });

  it('fmtMoney groups thousands and cents', () => {
    expect(fmtMoney(500000)).toBe('R5,000.00');
    expect(fmtMoney(502550)).toBe('R5,025.50');
    expect(fmtMoney(99)).toBe('R0.99');
    expect(fmtMoney(1234567)).toBe('R12,345.67');
  });

  it('fmtMoney uses a custom currency symbol', () => {
    expect(fmtMoney(500000, '$')).toBe('$5,000.00');
    expect(fmtMoney(500000, '')).toBe('5,000.00');
    expect(fmtMoney(-1500, '€')).toBe('-€15.00');
  });

  it('currentSegment finds the segment covering a day, else null', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = compute(pay, end, 500000, 0, cfg());
    expect(currentSegment(result, pay)).toBe(0);
    expect(currentSegment(result, result.dates[1])).toBe(1);
    expect(currentSegment(result, pay - 1)).toBeNull();
    expect(currentSegment(result, end + 1)).toBeNull();
  });

  it('nextPayout returns days to the upcoming payout, else null', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = compute(pay, end, 500000, 0, cfg());
    expect(nextPayout(result, pay)).toBe(result.dates[1] - pay);
    expect(nextPayout(result, end)).toBeNull();
    expect(nextPayout(result, end + 1)).toBeNull();
  });

  it('nextPayout counts down to the pay date before the plan starts', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = compute(pay, end, 500000, 0, cfg());
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
    const { dates } = compute(pay, end, 500000, 0, friday);
    expect(dates[0]).toBe(pay);
    expect(weekday(dates[1])).toBe(5);
    expect(dates[1]).toBe(daysFromCivil(2026, 6, 26));
  });

  it('interval spaces payouts', () => {
    const pay = daysFromCivil(2026, 6, 22);
    const end = daysFromCivil(2026, 8, 31);
    const fortnightly: Config = { ...defaultConfig(), interval: 14 };
    const { dates, amounts } = compute(pay, end, 800000, 0, fortnightly);
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
    const { amounts } = compute(pay, end, 500000, 0, r100);
    expect(sum(amounts)).toBe(500000);
    for (const a of amounts.slice(1)) {
      expect(a % 10000).toBe(0);
    }
  });
});
