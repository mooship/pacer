import { describe, expect, it } from 'vitest';
import { compute } from './compute.js';
import { defaultConfig } from './config.js';
import { buildCsv } from './csv.js';
import { daysFromCivil } from './date.js';

const computed = compute(
  daysFromCivil(2026, 6, 25),
  daysFromCivil(2026, 7, 24),
  500000,
  defaultConfig(),
);
if (!computed.ok) {
  throw new Error(computed.error);
}
const result = computed.value;

describe('buildCsv', () => {
  it('escapes double quotes in a custom currency by doubling them', () => {
    const csv = buildCsv(result, 500000, '"');
    expect(csv.ok && csv.value).toContain('"""700.00"');
  });

  it('keeps a comma-containing currency inside its quoted cell', () => {
    const csv = buildCsv(result, 500000, 'a,b');
    if (!csv.ok) {
      throw new Error(csv.error);
    }
    const rows = csv.value.trimEnd().split('\n');
    for (const row of rows.slice(1)) {
      expect(row).toMatch(/"a,b[\d,.]+"/);
    }
  });

  it('produces an empty per-day figure instead of NaN for an empty result', () => {
    const csv = buildCsv({ dates: [], segDays: [], amounts: [] }, 0);
    expect(csv.ok && csv.value).toContain('"Total",,0,"R0.00","R0.00"');
  });

  it('returns an error when the result arrays have mismatched lengths', () => {
    const csv = buildCsv({ dates: [0, 1], segDays: [1], amounts: [100, 200] }, 300);
    expect(csv.ok).toBe(false);
    expect(!csv.ok && csv.error).toMatch(/matching lengths/);
  });
});
