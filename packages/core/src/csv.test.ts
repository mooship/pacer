import { describe, expect, it } from 'vitest';
import { compute } from './compute.js';
import { defaultConfig } from './config.js';
import { buildCsv } from './csv.js';
import { daysFromCivil } from './date.js';

const result = compute(
  daysFromCivil(2026, 6, 25),
  daysFromCivil(2026, 7, 24),
  500000,
  0,
  defaultConfig(),
);

describe('buildCsv', () => {
  it('escapes double quotes in a custom currency by doubling them', () => {
    const csv = buildCsv(result, 500000, '"');
    expect(csv).toContain('"""700.00"');
  });

  it('keeps a comma-containing currency inside its quoted cell', () => {
    const csv = buildCsv(result, 500000, 'a,b');
    const rows = csv.trimEnd().split('\n');
    for (const row of rows.slice(1)) {
      expect(row.split('","').length).toBeGreaterThan(1);
    }
    expect(csv).toContain('"a,b');
  });

  it('throws when the result arrays have mismatched lengths', () => {
    expect(() => buildCsv({ dates: [0, 1], segDays: [1], amounts: [100, 200] }, 300)).toThrow(
      /matching lengths/,
    );
  });
});
