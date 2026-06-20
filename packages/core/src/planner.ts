import { type ComputeResult, compute, fmtMoney } from './compute.js';
import { type Config, sanitize } from './config.js';
import { MAX_DAYS } from './constants.js';
import { fmtWdDmy } from './date.js';
import { clamp, remEuclid } from './math.js';
import { parseAmount, resolveDate } from './parse.js';
import { err, ok, type Result } from './result.js';

export type Step = 'payDate' | 'lastDay' | 'amount' | 'results' | 'settings';

export const SETTINGS_QUANTUM = 0;
export const SETTINGS_PAYDAY = 1;
export const SETTINGS_INTERVAL = 2;
export const SETTINGS_CURSOR_MAX = SETTINGS_INTERVAL;

export interface PlannerState {
  step: Step;
  payInput: string;
  lastInput: string;
  amountInput: string;
  error: string | null;
  notice: string | null;
  today: number;
  pay: number | null;
  last: number | null;
  total: number | null;
  boost: number;
  boostMax: number;
  results: ComputeResult | null;
  config: Config;
  settingsCursor: number;
  quantumInput: string;
  intervalInput: string;
  settingsReturn: Step;
}

export type Action =
  | { type: 'setPayInput'; value: string }
  | { type: 'setLastInput'; value: string }
  | { type: 'setAmountInput'; value: string }
  | { type: 'confirm' }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'setBoost'; value: number }
  | { type: 'boostUp' }
  | { type: 'boostDown' }
  | { type: 'boostUpCoarse' }
  | { type: 'boostDownCoarse' }
  | { type: 'boostToMin' }
  | { type: 'boostToMax' }
  | { type: 'openSettings' }
  | { type: 'settingsUp' }
  | { type: 'settingsDown' }
  | { type: 'paydayPrev' }
  | { type: 'paydayNext' }
  | { type: 'setQuantumInput'; value: string }
  | { type: 'setIntervalInput'; value: string }
  | { type: 'settingsSaved'; config: Config }
  | { type: 'notice'; value: string | null }
  | { type: 'error'; value: string | null };

export function initialState(config: Config, today: number): PlannerState {
  return {
    step: 'payDate',
    payInput: '',
    lastInput: '',
    amountInput: '',
    error: null,
    notice: null,
    today,
    pay: null,
    last: null,
    total: null,
    boost: 0,
    boostMax: 0,
    results: null,
    config,
    settingsCursor: 0,
    quantumInput: '',
    intervalInput: '',
    settingsReturn: 'payDate',
  };
}

export function boostMax(amounts: number[]): number {
  return amounts.slice(1).reduce((a, b) => a + b, 0);
}

function recompute(s: PlannerState): void {
  if (s.pay === null || s.last === null || s.total === null) {
    return;
  }
  s.results = compute(s.pay, s.last, s.total, s.boost, s.config);
}

function enterResults(s: PlannerState): void {
  s.boost = 0;
  recompute(s);
  s.boostMax = s.results ? boostMax(s.results.amounts) : 0;
}

function setBoost(s: PlannerState, boost: number): void {
  s.boost = clamp(boost, 0, s.boostMax);
  recompute(s);
}

export function parseSettings(
  quantumInput: string,
  intervalInput: string,
  payday: number,
): Result<Config> {
  const quantum = parseAmount(quantumInput);
  if (!quantum.ok) {
    return quantum;
  }
  const trimmed = intervalInput.trim();
  const interval = /^[0-9]+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
  if (!Number.isSafeInteger(interval) || interval < 1) {
    return err('interval must be a whole number of days');
  }
  return ok(sanitize({ quantum: quantum.value, payday, interval }));
}

export function saveSettingsAction(
  quantumInput: string,
  intervalInput: string,
  payday: number,
  persist: (config: Config) => void,
): Action {
  const parsed = parseSettings(quantumInput, intervalInput, payday);
  if (!parsed.ok) {
    return { type: 'error', value: parsed.error };
  }
  try {
    persist(parsed.value);
    return { type: 'settingsSaved', config: parsed.value };
  } catch (e) {
    return { type: 'error', value: `could not save settings: ${String(e)}` };
  }
}

export function reducer(state: PlannerState, action: Action): PlannerState {
  const s: PlannerState = { ...state, error: null, notice: null };

  switch (action.type) {
    case 'setPayInput':
      s.payInput = action.value;
      return s;
    case 'setLastInput':
      s.lastInput = action.value;
      return s;
    case 'setAmountInput':
      s.amountInput = action.value;
      return s;

    case 'confirm': {
      if (s.step === 'payDate') {
        const r = resolveDate(s.payInput, s.today);
        if (r.ok) {
          s.pay = r.value;
          s.step = 'lastDay';
        } else {
          s.error = r.error;
        }
      } else if (s.step === 'lastDay') {
        if (s.lastInput.trim() === '') {
          s.error = 'enter the last day (e.g. +30 or 2026-07-24)';
          return s;
        }
        if (s.pay === null) {
          return s;
        }
        const r = resolveDate(s.lastInput, s.pay);
        if (!r.ok) {
          s.error = r.error;
        } else if (r.value < s.pay) {
          s.error = 'must be on or after the pay date';
        } else if (r.value - s.pay + 1 > MAX_DAYS) {
          s.error = "period can't be longer than a year";
        } else {
          s.last = r.value;
          s.step = 'amount';
        }
      } else if (s.step === 'amount') {
        const r = parseAmount(s.amountInput);
        if (r.ok) {
          s.total = r.value;
          enterResults(s);
          s.step = 'results';
        } else {
          s.error = r.error;
        }
      }
      return s;
    }

    case 'back': {
      switch (s.step) {
        case 'payDate':
          break;
        case 'lastDay':
          s.pay = null;
          s.step = 'payDate';
          break;
        case 'amount':
          s.last = null;
          s.step = 'lastDay';
          break;
        case 'results':
          s.total = null;
          s.boost = 0;
          s.results = null;
          s.step = 'amount';
          break;
        case 'settings':
          s.step = s.settingsReturn;
          break;
      }
      return s;
    }

    case 'reset':
      return initialState(s.config, s.today);

    case 'setBoost':
      setBoost(s, action.value);
      return s;
    case 'boostUp':
      setBoost(s, s.boost + s.config.quantum);
      return s;
    case 'boostDown':
      setBoost(s, s.boost - s.config.quantum);
      return s;
    case 'boostUpCoarse':
      setBoost(s, s.boost + 10 * s.config.quantum);
      return s;
    case 'boostDownCoarse':
      setBoost(s, s.boost - 10 * s.config.quantum);
      return s;
    case 'boostToMin':
      setBoost(s, 0);
      return s;
    case 'boostToMax':
      setBoost(s, s.boostMax);
      return s;

    case 'openSettings': {
      if (s.step === 'settings') {
        return s;
      }
      s.settingsReturn = s.step;
      s.settingsCursor = 0;
      s.quantumInput = fmtMoney(s.config.quantum).replace(/^R/, '');
      s.intervalInput = s.config.interval.toString();
      s.step = 'settings';
      return s;
    }
    case 'settingsUp':
      s.settingsCursor = Math.max(0, s.settingsCursor - 1);
      return s;
    case 'settingsDown':
      s.settingsCursor = Math.min(SETTINGS_CURSOR_MAX, s.settingsCursor + 1);
      return s;
    case 'paydayPrev':
      s.config = { ...s.config, payday: remEuclid(s.config.payday - 1, 7) };
      return s;
    case 'paydayNext':
      s.config = { ...s.config, payday: remEuclid(s.config.payday + 1, 7) };
      return s;
    case 'setQuantumInput':
      s.quantumInput = action.value;
      return s;
    case 'setIntervalInput':
      s.intervalInput = action.value;
      return s;

    case 'settingsSaved': {
      s.config = action.config;
      s.notice = 'settings saved';
      s.step = s.settingsReturn;
      if (s.step === 'results') {
        enterResults(s);
      }
      return s;
    }

    case 'notice':
      s.notice = action.value;
      return s;
    case 'error':
      s.error = action.value;
      return s;
  }
}

export interface Previews {
  pay: string;
  last: string;
  amount: string;
}

export function previews(s: PlannerState): Previews {
  const payR = resolveDate(s.payInput, s.today);
  const pay = payR.ok ? fmtWdDmy(payR.value) : '';

  let last = '';
  if (s.pay !== null && s.lastInput.trim() !== '') {
    const r = resolveDate(s.lastInput, s.pay);
    if (r.ok && r.value >= s.pay) {
      last = `${fmtWdDmy(r.value)} · ${r.value - s.pay + 1} days`;
    }
  }

  let amount = '';
  if (s.amountInput.trim() !== '') {
    const r = parseAmount(s.amountInput);
    if (r.ok) {
      amount = fmtMoney(r.value);
    }
  }

  return { pay, last, amount };
}

export type StepStatus = 'done' | 'current' | 'todo';

export function breadcrumb(step: Step): { name: string; status: StepStatus }[] {
  const current = step === 'payDate' ? 0 : step === 'lastDay' ? 1 : step === 'amount' ? 2 : 3;
  const names = ['Pay date', 'Last day', 'Amount'];
  return names.map((name, i) => ({
    name,
    status: i < current ? 'done' : i === current ? 'current' : 'todo',
  }));
}
