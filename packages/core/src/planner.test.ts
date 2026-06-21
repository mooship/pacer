import { describe, expect, it } from 'vitest';
import { defaultConfig } from './config.js';
import { buildCsv } from './csv.js';
import { daysFromCivil } from './date.js';
import {
  type Action,
  initialState,
  type PlannerState,
  parseSettings,
  planSnapshot,
  reducer,
} from './planner.js';
import { buildSummaryText, summaryLine } from './text.js';

const start = (today = daysFromCivil(2026, 6, 17)): PlannerState =>
  initialState(defaultConfig(), today);

const run = (state: PlannerState, ...actions: Action[]): PlannerState =>
  actions.reduce(reducer, state);

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

const resultsState = (): PlannerState =>
  run(
    start(),
    { type: 'setPayInput', value: '2026-06-25' },
    { type: 'confirm' },
    { type: 'setLastInput', value: '2026-07-24' },
    { type: 'confirm' },
    { type: 'setAmountInput', value: '5000' },
    { type: 'confirm' },
  );

describe('planner', () => {
  it('empty pay date is rejected', () => {
    const today = daysFromCivil(2026, 6, 17);
    const s = run(start(today), { type: 'confirm' });
    expect(s.step).toBe('payDate');
    expect(s.pay).toBeNull();
    expect(s.error).not.toBeNull();
  });

  it('explicit today resolves the pay date', () => {
    const today = daysFromCivil(2026, 6, 17);
    const s = run(start(today), { type: 'setPayInput', value: 'today' }, { type: 'confirm' });
    expect(s.step).toBe('lastDay');
    expect(s.pay).toBe(today);
  });

  it('relative last day is offset from pay', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '+30' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('amount');
    expect(s.last).toBe(daysFromCivil(2026, 6, 25) + 30);
  });

  it('last day before pay is rejected', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-06-24' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('lastDay');
    expect(s.error).not.toBeNull();
  });

  it('empty last day is rejected', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('lastDay');
    expect(s.error).not.toBeNull();
  });

  it('back clears value', () => {
    const s = run(start(), { type: 'setPayInput', value: '2026-06-25' }, { type: 'confirm' });
    expect(s.step).toBe('lastDay');
    const back = run(s, { type: 'back' });
    expect(back.step).toBe('payDate');
    expect(back.pay).toBeNull();
  });

  it('reset returns to the first step, clears inputs, and preserves config', () => {
    const customConfig = { quantum: 1000, payday: 3, interval: 14, currency: 'R' };
    const s = run(
      resultsState(),
      { type: 'settingsSaved', config: customConfig },
      { type: 'reset' },
    );
    expect(s.step).toBe('payDate');
    expect(s.pay).toBeNull();
    expect(s.last).toBeNull();
    expect(s.total).toBeNull();
    expect(s.payInput).toBe('');
    expect(s.lastInput).toBe('');
    expect(s.amountInput).toBe('');
    expect(s.results).toBeNull();
    expect(s.config).toEqual(customConfig);
  });

  it('boost is clamped to recurring total', () => {
    let s = resultsState();
    expect(s.step).toBe('results');
    const results = s.results;
    if (!results || s.total === null) {
      throw new Error('expected results');
    }
    const recurring = sum(results.amounts.slice(1));
    expect(s.boostMax).toBe(recurring);
    expect(s.boostMax).toBeLessThan(s.total);
    for (let i = 0; i < 1000; i++) {
      s = reducer(s, { type: 'boostUp' });
    }
    expect(s.boost).toBe(s.boostMax);
    s = reducer(s, { type: 'boostUp' });
    expect(s.boost).toBe(s.boostMax);
    for (let i = 0; i < 2000; i++) {
      s = reducer(s, { type: 'boostDown' });
    }
    expect(s.boost).toBe(0);
  });

  it('coarse and jump boost', () => {
    let s = resultsState();
    s = reducer(s, { type: 'boostUpCoarse' });
    expect(s.boost).toBe(Math.min(10 * s.config.quantum, s.boostMax));
    s = reducer(s, { type: 'boostDownCoarse' });
    expect(s.boost).toBe(0);
    s = reducer(s, { type: 'boostToMax' });
    expect(s.boost).toBe(s.boostMax);
    s = reducer(s, { type: 'boostToMin' });
    expect(s.boost).toBe(0);
  });

  it('over-long period is rejected', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '+400' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('lastDay');
    expect(s.error).not.toBeNull();
  });

  it('full year period is accepted', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '+365' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('amount');
  });

  it('boost before results is a no-op', () => {
    const s = run(start(), { type: 'boostUp' }, { type: 'boostDown' });
    expect(s.boost).toBe(0);
    expect(s.results).toBeNull();
  });

  it('settings save persists config and recomputes', () => {
    let s = resultsState();
    s = reducer(s, { type: 'openSettings' });
    expect(s.step).toBe('settings');
    expect(s.quantumInput).toBe('50.00');
    expect(s.currencyInput).toBe('R');
    const parsed = parseSettings('100', '14', s.config.payday);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      s = reducer(s, { type: 'settingsSaved', config: parsed.value });
    }
    expect(s.step).toBe('results');
    expect(s.config.quantum).toBe(10000);
    expect(s.config.interval).toBe(14);
    expect(s.notice).toBe('settings saved');
  });

  it('parseSettings rejects bad interval', () => {
    expect(parseSettings('50', '0', 1).ok).toBe(false);
    expect(parseSettings('50', 'abc', 1).ok).toBe(false);
  });

  it('parseSettings carries and sanitizes the currency', () => {
    const parsed = parseSettings('50', '7', 1, ' $ ');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.currency).toBe('$');
    }
    const blank = parseSettings('50', '7', 1, '');
    expect(blank.ok && blank.value.currency).toBe('R');
  });
});

describe('buildCsv', () => {
  it('has a header, a row per segment, and a total', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const csv = buildCsv(s.results, s.total);
    const lines = csv.trimEnd().split('\n');
    const segments = s.results.dates.length;
    expect(lines[0]).toBe('Pay date,Covers,Days,Amount,Per day');
    expect(lines.length).toBe(segments + 2);
    expect(lines[lines.length - 1].startsWith('"Total"')).toBe(true);
  });

  it('renders amounts with the configured currency', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const csv = buildCsv(s.results, s.total, '$');
    expect(csv).toContain('$');
    expect(csv).not.toContain('R');
  });
});

describe('planSnapshot / restorePlan', () => {
  it('returns null before results and a snapshot on results', () => {
    expect(planSnapshot(start())).toBeNull();
    const s = resultsState();
    const snap = planSnapshot(s);
    expect(snap).toEqual({ pay: s.pay, last: s.last, total: s.total, boost: s.boost });
  });

  it('restores a plan to results with matching amounts and pre-filled inputs', () => {
    const original = resultsState();
    const snap = planSnapshot(original);
    if (!snap) {
      throw new Error('expected snapshot');
    }
    const restored = run(start(), { type: 'restorePlan', snap });
    expect(restored.step).toBe('results');
    expect(restored.pay).toBe(original.pay);
    expect(restored.last).toBe(original.last);
    expect(restored.total).toBe(original.total);
    expect(restored.payInput).toBe('2026-06-25');
    expect(restored.lastInput).toBe('2026-07-24');
    expect(restored.results?.amounts).toEqual(original.results?.amounts);
    expect(planSnapshot(restored)).toEqual(snap);
  });

  it('clamps a restored boost to the available maximum', () => {
    const restored = run(start(), {
      type: 'restorePlan',
      snap: {
        pay: daysFromCivil(2026, 6, 25),
        last: daysFromCivil(2026, 7, 24),
        total: 500000,
        boost: 999999999,
      },
    });
    expect(restored.boost).toBe(restored.boostMax);
  });

  it('edits back through pre-filled inputs after restore', () => {
    const snap = {
      pay: daysFromCivil(2026, 6, 25),
      last: daysFromCivil(2026, 7, 24),
      total: 500000,
      boost: 0,
    };
    const restored = run(start(), { type: 'restorePlan', snap });
    const back = run(restored, { type: 'back' });
    expect(back.step).toBe('amount');
    expect(back.amountInput).toBe('5,000.00');
  });
});

describe('buildSummaryText', () => {
  it('has a summary line, a header, a row per segment, and a total', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const text = buildSummaryText(s.results, s.total);
    const lines = text.trimEnd().split('\n');
    const segments = s.results.dates.length;
    expect(text.startsWith('Pacer plan:')).toBe(true);
    expect(text).toContain('Pay');
    expect(text).toContain('Bridge');
    expect(lines.length).toBe(segments + 4);
    expect(lines[lines.length - 1].startsWith('Total')).toBe(true);
  });

  it('respects a custom currency', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const text = buildSummaryText(s.results, s.total, '$');
    expect(text).toContain('$');
    expect(text).not.toContain('R5');
  });
});

describe('summaryLine', () => {
  it('describes a steady daily spend and cadence', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const line = summaryLine(s.results, s.total, s.config);
    expect(line).toContain('Spend about');
    expect(line).toContain('/day');
    expect(line).toContain('weekly');
  });

  it('handles a single-segment plan', () => {
    const single = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-06-26' },
      { type: 'confirm' },
      { type: 'setAmountInput', value: '1000' },
      { type: 'confirm' },
    );
    if (!single.results || single.total === null) {
      throw new Error('expected results');
    }
    const line = summaryLine(single.results, single.total, single.config);
    expect(line).toContain('Spend about');
    expect(line).toContain('to reach');
  });
});
