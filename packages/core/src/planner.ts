import { type ComputeResult, compute, fmtAmount, fmtMoney } from './compute.js';
import { type Config, DEFAULT_CURRENCY, sanitize } from './config.js';
import { MAX_DAYS } from './constants.js';
import { currencyDigits } from './currency.js';
import { fmtIso, fmtWdDmy } from './date.js';
import { remEuclid } from './math.js';
import { parseAmount, resolveDate } from './parse.js';
import { type Err, err, type Ok, ok, type Result } from './result.js';
import type { PlanSnapshot } from './snapshot.js';

/**
 * The wizard's current screen. The three input steps run in order
 * (`payDate` -> `lastDay` -> `amount`) into `results`; `settings` is an
 * overlay reachable from any step, remembering where to return via
 * {@link PlannerState.settingsReturn}.
 */
export type Step = 'payDate' | 'lastDay' | 'amount' | 'results' | 'settings';

/** Shared label for the initial (non-recurring) payment, used by `text.ts` and `ics.ts` too. */
export const BRIDGE_LABEL = 'Bridge';

/** The framework-agnostic state of the planner wizard, driven by {@link reducer}. */
export interface PlannerState {
  step: Step;
  payInput: string;
  lastInput: string;
  amountInput: string;
  error: string | null;
  notice: string | null;
  /** Day number treated as "today" — fixed at wizard start, not re-read live. */
  today: number;
  pay: number | null;
  last: number | null;
  total: number | null;
  results: ComputeResult | null;
  config: Config;
  quantumInput: string;
  intervalInput: string;
  currencyInput: string;
  /** The step to return to when the settings overlay closes. */
  settingsReturn: Step;
}

/** Actions dispatched to {@link reducer} to drive the wizard. */
export type Action =
  | { type: 'setPayInput'; value: string }
  | { type: 'setLastInput'; value: string }
  | { type: 'setAmountInput'; value: string }
  /** Validates the current step's input and advances one step. */
  | { type: 'confirm' }
  /** Validates all three input fields at once and jumps straight to results. */
  | { type: 'submit' }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'openSettings' }
  | { type: 'paydayPrev' }
  | { type: 'paydayNext' }
  | { type: 'setQuantumInput'; value: string }
  | { type: 'setIntervalInput'; value: string }
  | { type: 'setCurrencyInput'; value: string }
  /** Dispatched by the app after it has persisted a settings save. */
  | { type: 'settingsSaved'; config: Config }
  /** Dispatched by the app to load a persisted/shared plan straight into results. */
  | { type: 'restorePlan'; snap: PlanSnapshot }
  | { type: 'notice'; value: string | null }
  | { type: 'error'; value: string | null };

/** A fresh {@link PlannerState} at the `payDate` step, with `config` and `today` fixed for the session. */
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
    results: null,
    config,
    quantumInput: '',
    intervalInput: '',
    currencyInput: '',
    settingsReturn: 'payDate',
  };
}

function isOnResults(s: PlannerState): boolean {
  return (s.step === 'settings' ? s.settingsReturn : s.step) === 'results';
}

/**
 * The current plan's `{pay, last, total}`, but only once results are
 * actually showing — including while `settings` is open with
 * `settingsReturn === 'results'`. `null` at every earlier step.
 */
export function planSnapshot(s: PlannerState): PlanSnapshot | null {
  if (!isOnResults(s) || s.pay === null || s.last === null || s.total === null) {
    return null;
  }
  return { pay: s.pay, last: s.last, total: s.total };
}
function recompute(s: PlannerState): void {
  if (s.pay === null || s.last === null || s.total === null) {
    return;
  }
  const r = compute(s.pay, s.last, s.total, s.config);
  if (r.ok) {
    s.results = r.value;
  }
}

function enterResults(s: PlannerState): void {
  recompute(s);
}

/** Why a "last day" input failed to resolve, for tailoring the field's error hint. */
export type LastReason = 'before' | 'bad' | 'tooLong';

type LastResult = Ok<number> | (Err & { reason: LastReason });

/** Resolves the "last day" field against `pay`, additionally rejecting a day before `pay` or a span longer than {@link MAX_DAYS}. */
function resolveLast(lastInput: string, pay: number): LastResult {
  const r = resolveDate(lastInput, pay);
  if (!r.ok) {
    return { ...r, reason: 'bad' };
  }
  if (r.value < pay) {
    return { ...err('must be on or after the pay date'), reason: 'before' };
  }
  if (r.value - pay + 1 > MAX_DAYS) {
    return { ...err("period can't be longer than a year"), reason: 'tooLong' };
  }
  return ok(r.value);
}

/**
 * Parses the settings form's raw string inputs into a sanitized {@link Config}.
 * `payday` is taken as-is (already an in-range number from the picker, not
 * a string field). Fails on an invalid amount or a non-positive integer interval.
 */
export function parseSettings(
  quantumInput: string,
  intervalInput: string,
  payday: number,
  currencyInput = DEFAULT_CURRENCY,
): Result<Config> {
  const quantum = parseAmount(quantumInput, currencyDigits(currencyInput));
  if (!quantum.ok) {
    return quantum;
  }
  const trimmed = intervalInput.trim();
  const interval = /^[0-9]+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
  if (!Number.isSafeInteger(interval) || interval < 1) {
    return err('interval must be a whole number of days');
  }
  return ok(sanitize({ quantum: quantum.value, payday, interval, currency: currencyInput }));
}

/**
 * Parses the settings form via {@link parseSettings}, then calls `persist`
 * with the result. Returns an {@link Action} to dispatch: `settingsSaved` on
 * success, or `error` if parsing failed or `persist` threw.
 */
export function saveSettingsAction(
  quantumInput: string,
  intervalInput: string,
  payday: number,
  persist: (config: Config) => void,
  currencyInput = DEFAULT_CURRENCY,
): Action {
  const parsed = parseSettings(quantumInput, intervalInput, payday, currencyInput);
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

/** The planner wizard's state transition function. Never touches storage or the DOM — the app dispatches `settingsSaved`/`restorePlan` after doing persistence itself. */
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
        if (s.payInput.trim() === '') {
          s.error = 'enter the pay date (e.g. today, +7, or 2026-07-25)';
          return s;
        }
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
        const r = resolveLast(s.lastInput, s.pay);
        if (!r.ok) {
          s.error = r.error;
        } else {
          s.last = r.value;
          s.step = 'amount';
        }
      } else if (s.step === 'amount') {
        const r = parseAmount(s.amountInput, currencyDigits(s.config.currency));
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

    case 'submit': {
      if (s.payInput.trim() === '') {
        s.error = 'enter the pay date (e.g. today, +7, or 2026-07-25)';
        return s;
      }
      const payR = resolveDate(s.payInput, s.today);
      if (!payR.ok) {
        s.error = payR.error;
        return s;
      }
      if (s.lastInput.trim() === '') {
        s.error = 'enter the last day (e.g. +30 or 2026-07-24)';
        return s;
      }
      const lastR = resolveLast(s.lastInput, payR.value);
      if (!lastR.ok) {
        s.error = lastR.error;
        return s;
      }
      const amtR = parseAmount(s.amountInput, currencyDigits(s.config.currency));
      if (!amtR.ok) {
        s.error = amtR.error;
        return s;
      }
      s.pay = payR.value;
      s.last = lastR.value;
      s.total = amtR.value;
      enterResults(s);
      s.step = 'results';
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

    case 'openSettings': {
      if (s.step === 'settings') {
        return s;
      }
      s.settingsReturn = s.step;
      s.quantumInput = fmtAmount(s.config.quantum, s.config.currency);
      s.intervalInput = s.config.interval.toString();
      s.currencyInput = s.config.currency;
      s.step = 'settings';
      return s;
    }
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
    case 'setCurrencyInput': {
      const parsed = parseAmount(s.quantumInput, currencyDigits(s.currencyInput));
      if (parsed.ok) {
        s.quantumInput = fmtAmount(parsed.value, action.value);
      }
      s.currencyInput = action.value;
      return s;
    }

    case 'settingsSaved': {
      s.config = action.config;
      s.notice = 'settings saved';
      s.step = s.settingsReturn;
      if (s.step === 'results') {
        enterResults(s);
      }
      return s;
    }

    case 'restorePlan': {
      const { pay, last, total } = action.snap;
      s.pay = pay;
      s.last = last;
      s.total = total;
      s.payInput = fmtIso(pay);
      s.lastInput = fmtIso(last);
      s.amountInput = fmtAmount(total, s.config.currency);
      enterResults(s);
      s.step = 'results';
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

/** Validity of one form field, for styling/hint purposes. */
export type FieldState = 'empty' | 'ok' | 'invalid';

/** Live preview text and validity for each of the wizard's three input fields. */
export interface Previews {
  /** Formatted preview of the resolved pay date, or `''` if empty/invalid. */
  pay: string;
  /** Formatted preview of the resolved last day plus day count, or `''` if empty/invalid. */
  last: string;
  /** Formatted preview of the parsed amount, or `''` if empty/invalid. */
  amount: string;
  /** The resolved pay date as a day number, or `null` if not yet resolved. */
  payDay: number | null;
  payState: FieldState;
  lastState: FieldState;
  /** Why the last-day field is invalid, when `lastState === 'invalid'`. */
  lastReason: LastReason | null;
  amountState: FieldState;
}

/** Computes live preview text and per-field validity for the current form inputs, without mutating state. */
export function previews(s: PlannerState): Previews {
  let pay = '';
  let payState: FieldState = 'empty';
  let payDay: number | null = null;
  if (s.payInput.trim() !== '') {
    const payR = resolveDate(s.payInput, s.today);
    if (payR.ok) {
      pay = fmtWdDmy(payR.value);
      payState = 'ok';
      payDay = payR.value;
    } else {
      payState = 'invalid';
    }
  }

  let last = '';
  let lastState: FieldState = 'empty';
  let lastReason: LastReason | null = null;
  if (s.lastInput.trim() !== '') {
    if (payDay === null) {
      lastState = 'invalid';
    } else {
      const r = resolveLast(s.lastInput, payDay);
      if (r.ok) {
        last = `${fmtWdDmy(r.value)} · ${r.value - payDay + 1} days`;
        lastState = 'ok';
      } else {
        lastState = 'invalid';
        lastReason = r.reason;
      }
    }
  }

  let amount = '';
  let amountState: FieldState = 'empty';
  if (s.amountInput.trim() !== '') {
    const r = parseAmount(s.amountInput, currencyDigits(s.config.currency));
    if (r.ok) {
      amount = fmtMoney(r.value, s.config.currency);
      amountState = 'ok';
    } else {
      amountState = 'invalid';
    }
  }

  return { pay, last, amount, payDay, payState, lastState, lastReason, amountState };
}

/** The mascot/UI mood driven by wizard state. */
export type Mood = 'idle' | 'success' | 'error';

/** `'error'` when an error is showing outside settings, `'success'` once results are showing, otherwise `'idle'`. */
export function mood(s: PlannerState): Mood {
  if (s.error && s.step !== 'settings') {
    return 'error';
  }
  return isOnResults(s) ? 'success' : 'idle';
}

/** Status of one breadcrumb step relative to the current step. */
export type StepStatus = 'done' | 'current' | 'todo';

/** The three input-step breadcrumbs (Pay date/Last day/Amount) with their status relative to `step`. */
export function breadcrumb(step: Step): { name: string; status: StepStatus }[] {
  const current = step === 'payDate' ? 0 : step === 'lastDay' ? 1 : step === 'amount' ? 2 : 3;
  const names = ['Pay date', 'Last day', 'Amount'];
  return names.map((name, i) => ({
    name,
    status: i < current ? 'done' : i === current ? 'current' : 'todo',
  }));
}
