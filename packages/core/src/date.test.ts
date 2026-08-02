import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  civilFromDays,
  daysFromCivil,
  daysInMonth,
  fmtDmy,
  fmtIso,
  fmtRange,
  fmtWdDm,
  today,
  weekday,
} from './date.js';

describe('date', () => {
  it('round trips common dates', () => {
    const cases: [number, number, number][] = [
      [2026, 6, 25],
      [2000, 2, 29],
      [1970, 1, 1],
      [2024, 12, 31],
    ];
    for (const [y, m, d] of cases) {
      expect(civilFromDays(daysFromCivil(y, m, d))).toEqual([y, m, d]);
    }
  });

  it('round trips at the accepted year extremes', () => {
    expect(civilFromDays(daysFromCivil(1, 1, 1))).toEqual([1, 1, 1]);
    expect(civilFromDays(daysFromCivil(9999, 12, 31))).toEqual([9999, 12, 31]);
  });

  it('round trips proleptic years before year 1, exercising the negative-era branches', () => {
    expect(civilFromDays(daysFromCivil(0, 1, 1))).toEqual([0, 1, 1]);
    expect(civilFromDays(daysFromCivil(-400, 6, 15))).toEqual([-400, 6, 15]);
  });

  it('epoch is a Thursday', () => {
    expect(weekday(0)).toBe(4);
  });

  it('known Wednesday', () => {
    expect(weekday(daysFromCivil(2026, 6, 17))).toBe(3);
  });

  it('known Thursday', () => {
    expect(weekday(daysFromCivil(2026, 6, 25))).toBe(4);
  });

  it('known Monday', () => {
    expect(weekday(daysFromCivil(2026, 6, 29))).toBe(1);
  });

  it('handles pre-epoch (negative) days', () => {
    expect(weekday(-1)).toBe(3);
    expect(weekday(daysFromCivil(1969, 12, 25))).toBe(4);
  });

  it('daysInMonth accounts for leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it('daysInMonth returns 0 for an out-of-range month', () => {
    expect(daysInMonth(2026, 0)).toBe(0);
    expect(daysInMonth(2026, 13)).toBe(0);
  });

  it('fmtDmy renders day month year', () => {
    expect(fmtDmy(daysFromCivil(2026, 7, 5))).toBe('5 Jul 2026');
  });

  it('fmtWdDm renders weekday, day, and month without a year', () => {
    expect(fmtWdDm(daysFromCivil(2026, 6, 25))).toBe('Thu 25 Jun');
  });

  describe('today', () => {
    beforeEach(() => {
      // Pin the clock instead of reading it twice (once here, once inside
      // today()): a real midnight rollover between those two reads would
      // make this test flake once a day.
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('reads the local calendar date', () => {
      vi.setSystemTime(new Date(2026, 5, 25, 23, 59, 59));
      expect(today()).toBe(daysFromCivil(2026, 6, 25));
    });

    it('reads the date right at the start of the day', () => {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
      expect(today()).toBe(daysFromCivil(2026, 1, 1));
    });
  });

  it('fmtRange same day', () => {
    const d = daysFromCivil(2026, 6, 25);
    expect(fmtRange(d, d)).toBe('25 Jun');
  });

  it('fmtRange same month', () => {
    const s = daysFromCivil(2026, 6, 25);
    const e = daysFromCivil(2026, 6, 28);
    expect(fmtRange(s, e)).toBe('25–28 Jun');
  });

  it('fmtRange cross month', () => {
    const s = daysFromCivil(2026, 6, 29);
    const e = daysFromCivil(2026, 7, 5);
    expect(fmtRange(s, e)).toBe('29 Jun–5 Jul');
  });

  it('fmtRange cross year includes both years', () => {
    const s = daysFromCivil(2026, 12, 29);
    const e = daysFromCivil(2027, 1, 2);
    expect(fmtRange(s, e)).toBe('29 Dec 2026–2 Jan 2027');
  });

  it('fmtIso zero-pads and round-trips through parseable form', () => {
    expect(fmtIso(daysFromCivil(2026, 7, 5))).toBe('2026-07-05');
    expect(fmtIso(daysFromCivil(2026, 12, 25))).toBe('2026-12-25');
  });
});
