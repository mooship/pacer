import { describe, expect, it } from 'vitest';
import { MAX_DAYS } from './constants.js';
import { daysFromCivil } from './date.js';
import { decodePlan, encodePlan, type PlanSnapshot } from './snapshot.js';

const sample: PlanSnapshot = {
  pay: daysFromCivil(2026, 6, 25),
  last: daysFromCivil(2026, 7, 24),
  total: 500000,
  boost: 15000,
};

describe('snapshot', () => {
  it('round-trips through encode and decode', () => {
    const decoded = decodePlan(new URLSearchParams(encodePlan(sample)));
    expect(decoded).toEqual({ ok: true, value: sample });
  });

  it('decodes from a plain record', () => {
    const decoded = decodePlan({ p: sample.pay, l: sample.last, t: sample.total, b: sample.boost });
    expect(decoded).toEqual({ ok: true, value: sample });
  });

  it('rejects missing fields', () => {
    const decoded = decodePlan({ p: sample.pay, l: sample.last, t: sample.total });
    expect(decoded.ok).toBe(false);
  });

  it('rejects non-integer fields', () => {
    const decoded = decodePlan({ p: '1.5', l: sample.last, t: sample.total, b: 0 });
    expect(decoded.ok).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    const decoded = decodePlan({ p: sample.pay, l: sample.last, t: 0, b: 0 });
    expect(decoded.ok).toBe(false);
  });

  it('rejects an end before the pay date', () => {
    const decoded = decodePlan({ p: sample.pay, l: sample.pay - 1, t: sample.total, b: 0 });
    expect(decoded.ok).toBe(false);
  });

  it('rejects a period longer than a year', () => {
    const decoded = decodePlan({ p: 0, l: MAX_DAYS, t: sample.total, b: 0 });
    expect(decoded.ok).toBe(false);
  });

  it('rejects a negative boost', () => {
    const decoded = decodePlan({ p: sample.pay, l: sample.last, t: sample.total, b: -1 });
    expect(decoded.ok).toBe(false);
  });
});
