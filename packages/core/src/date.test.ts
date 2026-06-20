import { describe, expect, it } from 'vitest';
import { civilFromDays, daysFromCivil, fmtIso, fmtRange, weekday } from './date.js';

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

  it('fmtIso zero-pads and round-trips through parseable form', () => {
    expect(fmtIso(daysFromCivil(2026, 7, 5))).toBe('2026-07-05');
    expect(fmtIso(daysFromCivil(2026, 12, 25))).toBe('2026-12-25');
  });
});
