import { describe, expect, it } from 'vitest';
import { type ComputeResult, compute } from './compute.js';
import { defaultConfig } from './config.js';
import { daysFromCivil } from './date.js';
import { actualSpent, expectedSpent, paceStatus } from './tracking.js';

function computeOk(...args: Parameters<typeof compute>): ComputeResult {
  const r = compute(...args);
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
}

// pay = Thu 2026-06-25, first weekly payout Mon 2026-06-29, end = 2026-07-24.
// Bridge segment: 2026-06-25..28 (4 days). First weekly: 2026-06-29..07-05 (7 days).
const pay = daysFromCivil(2026, 6, 25);
const end = daysFromCivil(2026, 7, 24);
const result = () => computeOk(pay, end, 500000, defaultConfig());

describe('expectedSpent', () => {
  it('is zero before the plan starts', () => {
    expect(expectedSpent(result(), pay - 1)).toBe(0);
  });

  it('prorates the in-progress segment (day 1 of 4)', () => {
    const r = result();
    expect(expectedSpent(r, pay)).toBe(Math.trunc((r.amounts[0] * 1) / r.segDays[0]));
  });

  it('prorates the in-progress segment (day 2 of 4)', () => {
    const r = result();
    expect(expectedSpent(r, pay + 1)).toBe(Math.trunc((r.amounts[0] * 2) / r.segDays[0]));
  });

  it('counts a finished segment in full once its coverage ends', () => {
    const r = result();
    const bridgeEnd = pay + r.segDays[0] - 1;
    expect(expectedSpent(r, bridgeEnd)).toBe(r.amounts[0]);
  });

  it('adds a later segment once it starts', () => {
    const r = result();
    const secondStart = r.dates[1];
    const expected = r.amounts[0] + Math.trunc((r.amounts[1] * 1) / r.segDays[1]);
    expect(expectedSpent(r, secondStart)).toBe(expected);
  });

  it('is the full total once the plan has run its course', () => {
    const r = result();
    expect(expectedSpent(r, end + 100)).toBe(500000);
  });
});

describe('actualSpent', () => {
  it('is zero with nothing marked', () => {
    expect(actualSpent(result(), new Set())).toBe(0);
  });

  it('sums the amounts of every marked payout date', () => {
    const r = result();
    const marked = new Set([r.dates[0], r.dates[2]]);
    expect(actualSpent(r, marked)).toBe(r.amounts[0] + r.amounts[2]);
  });

  it('ignores a marked date that is not a payout date', () => {
    const r = result();
    expect(actualSpent(r, new Set([r.dates[0] - 50]))).toBe(0);
  });
});

describe('paceStatus', () => {
  it('is null before the plan has started', () => {
    expect(paceStatus(result(), pay - 1, new Set())).toBeNull();
  });

  it('reports a positive delta when actual spend outruns the plan', () => {
    const r = result();
    const marked = new Set([r.dates[0]]);
    const status = paceStatus(r, pay, marked);
    if (!status) {
      throw new Error('expected a pace status');
    }
    expect(status.actual).toBe(r.amounts[0]);
    expect(status.expected).toBeLessThan(status.actual);
    expect(status.delta).toBe(status.actual - status.expected);
    expect(status.delta).toBeGreaterThan(0);
  });

  it('reports a negative delta when nothing has been marked yet mid-plan', () => {
    const r = result();
    const status = paceStatus(r, r.dates[1], new Set());
    if (!status) {
      throw new Error('expected a pace status');
    }
    expect(status.actual).toBe(0);
    expect(status.expected).toBeGreaterThan(0);
    expect(status.delta).toBeLessThan(0);
  });

  it('reports zero delta when actual matches expected exactly', () => {
    const r = result();
    const bridgeEnd = pay + r.segDays[0] - 1;
    const status = paceStatus(r, bridgeEnd, new Set([r.dates[0]]));
    expect(status?.delta).toBe(0);
  });
});
