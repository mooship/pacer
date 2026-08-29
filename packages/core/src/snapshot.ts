import { MAX_DAYS } from './constants.js';
import { err, ok, type Result } from './result.js';

/**
 * The three inputs that fully determine a plan: everything else (the
 * schedule) is recomputed from these plus the current `Config`.
 */
export interface PlanSnapshot {
  /** Day number the plan starts covering. */
  pay: number;
  /** Day number the plan stops covering (inclusive). */
  last: number;
  /** Total amount to distribute, in minor units. */
  total: number;
}

type Params = URLSearchParams | Record<string, unknown>;

function read(params: Params, key: string): string | null {
  if (params instanceof URLSearchParams) {
    return params.get(key);
  }
  const value = params[key];
  if (value === undefined || value === null) {
    return null;
  }
  return String(value);
}

function intField(params: Params, key: string): number | null {
  const raw = read(params, key);
  if (raw === null || !/^-?[0-9]+$/.test(raw.trim())) {
    return null;
  }
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) ? n : null;
}

/** Encodes a plan as a `p`/`l`/`t` query string, for sharing via URL. */
export function encodePlan(s: PlanSnapshot): string {
  return new URLSearchParams({
    p: String(s.pay),
    l: String(s.last),
    t: String(s.total),
  }).toString();
}

/**
 * Validates a plain `{pay, last, total}` object (e.g. from persisted JSON)
 * into a {@link PlanSnapshot}, reusing {@link decodePlan}'s validation.
 * Returns `null` on any validation failure rather than a `Result`.
 */
export function parsePlan(input: Record<string, unknown>): PlanSnapshot | null {
  const decoded = decodePlan({ p: input.pay, l: input.last, t: input.total });
  return decoded.ok ? decoded.value : null;
}

/** The seed plan used by the "See an example" action: a 30-day plan starting today. */
export function examplePlan(today: number): PlanSnapshot {
  return { pay: today, last: today + 30, total: 1850000 };
}

/** Whether two plans (or `null`s) have identical values. */
export function samePlan(a: PlanSnapshot | null, b: PlanSnapshot | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.pay === b.pay && a.last === b.last && a.total === b.total;
}

/**
 * Decodes and validates a plan from `p`/`l`/`t` fields, accepting either a
 * `URLSearchParams` or a plain object of string-coercible values. Fails if
 * any field is missing/non-integer, `total` isn't positive, `last` is
 * before `pay`, or the span exceeds {@link MAX_DAYS}.
 */
export function decodePlan(params: Params): Result<PlanSnapshot> {
  const pay = intField(params, 'p');
  const last = intField(params, 'l');
  const total = intField(params, 't');
  if (pay === null || last === null || total === null) {
    return err('plan is missing required fields');
  }
  if (total <= 0) {
    return err('plan amount must be positive');
  }
  if (last < pay) {
    return err('plan end must be on or after the pay date');
  }
  if (last - pay + 1 > MAX_DAYS) {
    return err("plan can't be longer than a year");
  }
  return ok({ pay, last, total });
}
