import { describe, expect, it } from 'vitest';
import { type ComputeResult, compute } from './compute.js';
import { type Config, defaultConfig } from './config.js';
import { daysFromCivil } from './date.js';
import { buildSummaryText, summaryLine } from './text.js';

function computeOk(...args: Parameters<typeof compute>): ComputeResult {
  const r = compute(...args);
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
}

describe('summaryLine', () => {
  it('uses "weekly" for the default 7-day interval', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const result = computeOk(pay, end, 500000, defaultConfig());
    expect(summaryLine(result, 500000, defaultConfig())).toContain('weekly');
  });

  it('uses "daily" for a 1-day interval', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 1);
    const cfg: Config = { ...defaultConfig(), interval: 1 };
    const result = computeOk(pay, end, 100000, cfg);
    expect(summaryLine(result, 100000, cfg)).toContain('daily');
    expect(summaryLine(result, 100000, cfg)).not.toContain('every 1 days');
  });

  it('uses "every N days" for a non-weekly, non-daily interval', () => {
    const pay = daysFromCivil(2026, 6, 22);
    const end = daysFromCivil(2026, 8, 31);
    const cfg: Config = { ...defaultConfig(), interval: 14 };
    const result = computeOk(pay, end, 800000, cfg);
    expect(summaryLine(result, 800000, cfg)).toContain('every 14 days');
  });

  it('falls back to a flat per-day rate when the whole amount lands in the bridge', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const cfg = defaultConfig();
    const result = computeOk(pay, end, 1, cfg);
    const steadyTotal = result.amounts.slice(1).reduce((a, b) => a + b, 0);
    expect(result.dates.length).toBeGreaterThan(1);
    expect(steadyTotal).toBe(0);
    const line = summaryLine(result, 1, cfg);
    expect(line).toContain('to reach');
  });
});

describe('buildSummaryText', () => {
  it('omits the bridge line for a single-payout plan', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const cfg = defaultConfig();
    const result = computeOk(pay, pay, 100000, cfg);
    const text = buildSummaryText(result, 100000, cfg);
    const lines = text.split('\n');
    expect(lines.length).toBe(2);
    expect(text).not.toContain('Bridge');
  });
});
