import { describe, expect, it } from 'vitest';
import { defaultConfig } from './config.js';
import { buildCsv } from './csv.js';
import { daysFromCivil, fmtWdDmy } from './date.js';
import {
  type Action,
  BRIDGE_LABEL,
  breadcrumb,
  initialState,
  mood,
  type PlannerState,
  parseSettings,
  planSnapshot,
  previews,
  reducer,
  SETTINGS_PAYDAY,
  saveSettingsAction,
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

describe('submit (all fields at once)', () => {
  it('resolves every field in one action and lands on results', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setLastInput', value: '2026-07-24' },
      { type: 'setAmountInput', value: '5000' },
      { type: 'submit' },
    );
    expect(s.step).toBe('results');
    expect(s.pay).toBe(daysFromCivil(2026, 6, 25));
    expect(s.last).toBe(daysFromCivil(2026, 7, 24));
    expect(s.total).toBe(500000);
    expect(sum(s.results?.amounts ?? [])).toBe(500000);
  });

  it('resolves the last day relative to the pay date entered alongside it', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setLastInput', value: '+30' },
      { type: 'setAmountInput', value: '5000' },
      { type: 'submit' },
    );
    expect(s.step).toBe('results');
    expect(s.last).toBe(daysFromCivil(2026, 6, 25) + 30);
  });

  it('stays on the form and reports the first problem', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setLastInput', value: '2026-06-24' },
      { type: 'setAmountInput', value: '5000' },
      { type: 'submit' },
    );
    expect(s.step).toBe('payDate');
    expect(s.error).not.toBeNull();
  });

  it('rejects a blank amount', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setLastInput', value: '2026-07-24' },
      { type: 'submit' },
    );
    expect(s.step).toBe('payDate');
    expect(s.total).toBeNull();
    expect(s.error).not.toBeNull();
  });

  it('rejects a blank pay date', () => {
    const s = run(start(), { type: 'submit' });
    expect(s.pay).toBeNull();
    expect(s.error).not.toBeNull();
  });

  it('rejects an unparseable pay date', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: 'not-a-date' },
      { type: 'setLastInput', value: '2026-07-24' },
      { type: 'setAmountInput', value: '5000' },
      { type: 'submit' },
    );
    expect(s.pay).toBeNull();
    expect(s.error).not.toBeNull();
  });

  it('rejects a blank last day', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setAmountInput', value: '5000' },
      { type: 'submit' },
    );
    expect(s.last).toBeNull();
    expect(s.error).not.toBeNull();
  });
});

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

  it('unparseable pay date is rejected via confirm', () => {
    const s = run(start(), { type: 'setPayInput', value: 'not-a-date' }, { type: 'confirm' });
    expect(s.step).toBe('payDate');
    expect(s.error).not.toBeNull();
  });

  it('unparseable last day is rejected via confirm', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: 'not-a-date' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('lastDay');
    expect(s.error).not.toBeNull();
  });

  it('unparseable amount is rejected via confirm', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-07-24' },
      { type: 'confirm' },
      { type: 'setAmountInput', value: 'abc' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('amount');
    expect(s.error).not.toBeNull();
  });

  it('confirm on lastDay with no pay set is a no-op (defensive guard)', () => {
    const s: PlannerState = { ...start(), step: 'lastDay', lastInput: '+30' };
    const again = reducer(s, { type: 'confirm' });
    expect(again.step).toBe('lastDay');
    expect(again.last).toBeNull();
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

  it('back from the amount step clears the last day and returns to lastDay', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-07-24' },
      { type: 'confirm' },
    );
    expect(s.step).toBe('amount');
    const back = run(s, { type: 'back' });
    expect(back.step).toBe('lastDay');
    expect(back.last).toBeNull();
  });

  it('back from the settings step returns to wherever settings was opened from', () => {
    const s = reducer(start(), { type: 'openSettings' });
    expect(s.step).toBe('settings');
    const back = reducer(s, { type: 'back' });
    expect(back.step).toBe('payDate');
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

  it('settingsSaved landing on results without a plan does not attempt to recompute (defensive guard)', () => {
    const s: PlannerState = { ...start(), step: 'settings', settingsReturn: 'results' };
    const saved = reducer(s, { type: 'settingsSaved', config: defaultConfig() });
    expect(saved.step).toBe('results');
    expect(saved.results).toBeNull();
  });

  it('parseSettings rejects bad interval', () => {
    expect(parseSettings('50', '0', 1).ok).toBe(false);
    expect(parseSettings('50', 'abc', 1).ok).toBe(false);
  });

  it('parseSettings rejects a bad quantum before checking the interval', () => {
    const r = parseSettings('abc', '0', 1);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('number');
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

describe('previews', () => {
  it('reports empty for blank inputs', () => {
    const v = previews(start());
    expect(v.payState).toBe('empty');
    expect(v.lastState).toBe('empty');
    expect(v.amountState).toBe('empty');
  });

  it('marks an unparseable date or amount as invalid', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: 'not-a-date' },
      { type: 'setAmountInput', value: 'abc' },
    );
    const v = previews(s);
    expect(v.payState).toBe('invalid');
    expect(v.pay).toBe('');
    expect(v.amountState).toBe('invalid');
  });

  it('marks a last day before pay day as invalid', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-06-20' },
    );
    expect(previews(s).lastState).toBe('invalid');
  });

  it('reports ok with a formatted preview for valid inputs', () => {
    const s = run(start(), { type: 'setPayInput', value: '2026-06-25' });
    const v = previews(s);
    expect(v.payState).toBe('ok');
    expect(v.pay).toBe(fmtWdDmy(daysFromCivil(2026, 6, 25)));
  });

  it('reports ok with a formatted preview once a valid last day is entered', () => {
    const s = run(
      start(),
      { type: 'setPayInput', value: '2026-06-25' },
      { type: 'setLastInput', value: '2026-07-24' },
    );
    const v = previews(s);
    expect(v.lastState).toBe('ok');
    expect(v.last).toContain('30 days');
  });

  it('reports ok with a formatted preview once a valid amount is entered', () => {
    const s = run(start(), { type: 'setAmountInput', value: '5000' });
    const v = previews(s);
    expect(v.amountState).toBe('ok');
    expect(v.amount).toBe('R5,000.00');
  });
});

describe('buildCsv', () => {
  it('has a header, a row per segment, and a total', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const csv = buildCsv(s.results, s.total);
    if (!csv.ok) {
      throw new Error(csv.error);
    }
    const lines = csv.value.trimEnd().split('\n');
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
    expect(csv.ok && csv.value).toContain('$');
    expect(csv.ok && csv.value).not.toContain('R');
  });
});

describe('planSnapshot / restorePlan', () => {
  it('returns null before results and a snapshot on results', () => {
    expect(planSnapshot(start())).toBeNull();
    const s = resultsState();
    const snap = planSnapshot(s);
    expect(snap).toEqual({ pay: s.pay, last: s.last, total: s.total });
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

  it('edits back through pre-filled inputs after restore', () => {
    const snap = {
      pay: daysFromCivil(2026, 6, 25),
      last: daysFromCivil(2026, 7, 24),
      total: 500000,
    };
    const restored = run(start(), { type: 'restorePlan', snap });
    const back = run(restored, { type: 'back' });
    expect(back.step).toBe('amount');
    expect(back.amountInput).toBe('5,000.00');
  });

  it('restoring an internally inconsistent snapshot (defensive guard) leaves results empty', () => {
    // restorePlan trusts its snapshot rather than re-validating it (that
    // happens at the decodePlan/parsePlan boundary); an end-before-pay
    // snapshot should fail compute() quietly rather than crash or show
    // stale results.
    const badSnap = {
      pay: daysFromCivil(2026, 6, 25),
      last: daysFromCivil(2026, 6, 20),
      total: 500000,
    };
    const restored = run(start(), { type: 'restorePlan', snap: badSnap });
    expect(restored.step).toBe('results');
    expect(restored.results).toBeNull();
  });
});

describe('buildSummaryText', () => {
  it('summarizes the plan as a short headline, bridge line, and cadence line', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const text = buildSummaryText(s.results, s.total, s.config);
    const lines = text.split('\n');
    expect(text.startsWith('Pacer plan:')).toBe(true);
    expect(text).toContain(BRIDGE_LABEL);
    expect(lines.length).toBe(3);
  });

  it('respects a custom currency', () => {
    const s = resultsState();
    if (!s.results || s.total === null) {
      throw new Error('expected results');
    }
    const text = buildSummaryText(s.results, s.total, { ...s.config, currency: '$' });
    expect(text).toContain('$');
    expect(text).not.toContain('R5');
  });

  it('stays a fixed length regardless of how many payouts the plan has', () => {
    const longPlan = run(
      start(daysFromCivil(2026, 1, 1)),
      { type: 'setPayInput', value: '2026-01-01' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '2026-12-31' },
      { type: 'confirm' },
      { type: 'setAmountInput', value: '240000' },
      { type: 'confirm' },
    );
    if (!longPlan.results || longPlan.total === null) {
      throw new Error('expected results');
    }
    expect(longPlan.results.dates.length).toBeGreaterThan(10);
    const text = buildSummaryText(longPlan.results, longPlan.total, longPlan.config);
    expect(text.split('\n').length).toBe(3);
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

describe('mood', () => {
  it('is idle before results with no error', () => {
    expect(mood(start())).toBe('idle');
  });

  it('is error when the current step has an error', () => {
    const s = run(start(), { type: 'confirm' });
    expect(s.error).not.toBeNull();
    expect(mood(s)).toBe('error');
  });

  it('is success once on the results step', () => {
    expect(mood(resultsState())).toBe('success');
  });

  it('ignores an error set while on the settings step, when settings was opened from a non-results step', () => {
    let s = reducer(start(), { type: 'openSettings' });
    s = reducer(s, { type: 'error', value: 'bad' });
    expect(s.step).toBe('settings');
    expect(s.error).not.toBeNull();
    expect(mood(s)).toBe('idle');
  });

  it('stays success in settings opened from results', () => {
    const s = reducer(resultsState(), { type: 'openSettings' });
    expect(mood(s)).toBe('success');
  });
});

describe('breadcrumb', () => {
  it('marks earlier steps done and the current step current', () => {
    expect(breadcrumb('payDate').map((c) => c.status)).toEqual(['current', 'todo', 'todo']);
    expect(breadcrumb('lastDay').map((c) => c.status)).toEqual(['done', 'current', 'todo']);
    expect(breadcrumb('amount').map((c) => c.status)).toEqual(['done', 'done', 'current']);
    expect(breadcrumb('results').map((c) => c.status)).toEqual(['done', 'done', 'done']);
  });

  it('names each step', () => {
    expect(breadcrumb('payDate').map((c) => c.name)).toEqual(['Pay date', 'Last day', 'Amount']);
  });
});

describe('saveSettingsAction', () => {
  it('returns an error action without persisting when parsing fails', () => {
    let persisted = false;
    const action = saveSettingsAction('50', 'abc', 1, () => {
      persisted = true;
    });
    expect(action.type).toBe('error');
    expect(persisted).toBe(false);
  });

  it('returns a settingsSaved action when persistence succeeds', () => {
    const action = saveSettingsAction('50', '7', 1, () => {});
    expect(action.type).toBe('settingsSaved');
  });

  it('returns an error action when persistence throws', () => {
    const action = saveSettingsAction('50', '7', 1, () => {
      throw new Error('disk full');
    });
    expect(action.type).toBe('error');
    expect(action.type === 'error' && action.value).toContain('disk full');
  });
});

describe('parseSettings edge cases', () => {
  it('rejects an empty interval', () => {
    expect(parseSettings('50', '', 1).ok).toBe(false);
  });

  it('rejects a negative interval', () => {
    expect(parseSettings('50', '-7', 1).ok).toBe(false);
  });

  it('rejects a decimal interval', () => {
    expect(parseSettings('50', '7.5', 1).ok).toBe(false);
  });

  it('rejects an interval beyond the safe integer range', () => {
    expect(parseSettings('50', '99999999999999999999', 1).ok).toBe(false);
  });
});

describe('reducer: settings field actions', () => {
  const inSettings = (): PlannerState => reducer(resultsState(), { type: 'openSettings' });

  it('settingsUp/settingsDown move the cursor within bounds', () => {
    let s = inSettings();
    expect(s.settingsCursor).toBe(0);
    s = reducer(s, { type: 'settingsUp' });
    expect(s.settingsCursor).toBe(0);
    s = reducer(s, { type: 'settingsDown' });
    expect(s.settingsCursor).toBe(1);
    s = reducer(s, { type: 'settingsDown' });
    s = reducer(s, { type: 'settingsDown' });
    s = reducer(s, { type: 'settingsDown' });
    expect(s.settingsCursor).toBe(SETTINGS_PAYDAY + 1);
  });

  it('paydayPrev/paydayNext wrap around the week', () => {
    let s = inSettings();
    expect(s.config.payday).toBe(1);
    s = reducer(s, { type: 'paydayPrev' });
    expect(s.config.payday).toBe(0);
    s = reducer(s, { type: 'paydayPrev' });
    expect(s.config.payday).toBe(6);
    s = reducer(s, { type: 'paydayNext' });
    s = reducer(s, { type: 'paydayNext' });
    expect(s.config.payday).toBe(1);
  });

  it('setQuantumInput/setIntervalInput/setCurrencyInput update their inputs', () => {
    let s = inSettings();
    s = reducer(s, { type: 'setQuantumInput', value: '100' });
    s = reducer(s, { type: 'setIntervalInput', value: '14' });
    s = reducer(s, { type: 'setCurrencyInput', value: '$' });
    expect(s.quantumInput).toBe('100');
    expect(s.intervalInput).toBe('14');
    expect(s.currencyInput).toBe('$');
  });

  it('re-entering openSettings while already in settings is a no-op', () => {
    const s = inSettings();
    const again = reducer(s, { type: 'openSettings' });
    expect(again).toEqual(s);
  });
});

describe('reducer: notice and error actions', () => {
  it('notice sets a notice message directly', () => {
    const s = reducer(start(), { type: 'notice', value: 'hello' });
    expect(s.notice).toBe('hello');
  });

  it('error sets an error message directly', () => {
    const s = reducer(start(), { type: 'error', value: 'oops' });
    expect(s.error).toBe('oops');
  });
});

describe('reducer: no-op edges', () => {
  it('confirm on the results step is a no-op', () => {
    const s = resultsState();
    const again = reducer(s, { type: 'confirm' });
    expect(again.step).toBe('results');
    expect(again.results).toEqual(s.results);
  });

  it('confirm on the settings step is a no-op', () => {
    const s = reducer(resultsState(), { type: 'openSettings' });
    const again = reducer(s, { type: 'confirm' });
    expect(again.step).toBe('settings');
  });

  it('back on the payDate step is a no-op', () => {
    const s = start();
    const again = reducer(s, { type: 'back' });
    expect(again.step).toBe('payDate');
    expect(again.pay).toBeNull();
  });
});
