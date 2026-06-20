import { describe, expect, it } from 'vitest';
import { daysFromCivil } from './date.js';
import { parseAmount, parseDate, resolveDate } from './parse.js';

const value = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) {
    throw new Error(`expected ok, got error: ${r.error}`);
  }
  return r.value;
};

describe('parseDate', () => {
  it('valid date', () => {
    expect(value(parseDate('2026-06-25'))).toEqual([2026, 6, 25]);
  });

  it('leap year Feb 29 accepted', () => {
    expect(parseDate('2000-02-29').ok).toBe(true);
  });

  it('non-leap Feb 29 rejected', () => {
    expect(parseDate('2026-02-29').ok).toBe(false);
  });

  it('wrong separator rejected', () => {
    expect(parseDate('2026/06/25').ok).toBe(false);
  });

  it('wrong field count rejected', () => {
    expect(parseDate('2026-06').ok).toBe(false);
  });

  it('month out of range rejected', () => {
    expect(parseDate('2026-13-01').ok).toBe(false);
  });

  it('day out of range rejected', () => {
    expect(parseDate('2026-06-31').ok).toBe(false);
  });

  it('year out of range rejected', () => {
    expect(parseDate('0000-01-01').ok).toBe(false);
    expect(parseDate('10000-01-01').ok).toBe(false);
    expect(parseDate('0001-01-01').ok).toBe(true);
  });
});

describe('parseAmount', () => {
  it('plain integer', () => {
    expect(value(parseAmount('5000'))).toBe(500000);
  });

  it('R prefix', () => {
    expect(value(parseAmount('R5000'))).toBe(500000);
  });

  it('commas', () => {
    expect(value(parseAmount('5,000'))).toBe(500000);
  });

  it('underscores', () => {
    expect(value(parseAmount('5_000'))).toBe(500000);
  });

  it('cents', () => {
    expect(value(parseAmount('5000.50'))).toBe(500050);
    expect(value(parseAmount('R1,234.05'))).toBe(123405);
  });

  it('single decimal is tenths', () => {
    expect(value(parseAmount('5000.5'))).toBe(500050);
  });

  it('too many decimals rejected', () => {
    expect(parseAmount('5000.567').ok).toBe(false);
  });

  it('stray letter rejected', () => {
    expect(parseAmount('5R0').ok).toBe(false);
  });

  it('zero rejected', () => {
    expect(parseAmount('0').ok).toBe(false);
  });

  it('negative rejected', () => {
    expect(parseAmount('-500').ok).toBe(false);
  });

  it('non-numeric rejected', () => {
    expect(parseAmount('abc').ok).toBe(false);
  });
});

describe('resolveDate', () => {
  it('today and empty return base', () => {
    const base = daysFromCivil(2026, 6, 17);
    expect(value(resolveDate('', base))).toBe(base);
    expect(value(resolveDate('today', base))).toBe(base);
    expect(value(resolveDate('  Today ', base))).toBe(base);
  });

  it('relative offsets', () => {
    const base = daysFromCivil(2026, 6, 25);
    expect(value(resolveDate('+30', base))).toBe(base + 30);
    expect(value(resolveDate('-5', base))).toBe(base - 5);
  });

  it('absolute date', () => {
    const base = daysFromCivil(2026, 6, 17);
    expect(value(resolveDate('2026-07-24', base))).toBe(daysFromCivil(2026, 7, 24));
  });

  it('bad offset rejected', () => {
    expect(resolveDate('+abc', 0).ok).toBe(false);
  });

  it('offset overflow rejected', () => {
    expect(resolveDate('+1', Number.MAX_SAFE_INTEGER).ok).toBe(false);
    expect(resolveDate('-1', Number.MIN_SAFE_INTEGER).ok).toBe(false);
  });
});
