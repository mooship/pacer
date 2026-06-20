import { MAX_DAYS } from './constants.js';
import { err, ok, type Result } from './result.js';

export interface PlanSnapshot {
  pay: number;
  last: number;
  total: number;
  boost: number;
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

export function encodePlan(s: PlanSnapshot): string {
  return new URLSearchParams({
    p: String(s.pay),
    l: String(s.last),
    t: String(s.total),
    b: String(s.boost),
  }).toString();
}

export function decodePlan(params: Params): Result<PlanSnapshot> {
  const pay = intField(params, 'p');
  const last = intField(params, 'l');
  const total = intField(params, 't');
  const boost = intField(params, 'b');
  if (pay === null || last === null || total === null || boost === null) {
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
  if (boost < 0) {
    return err('plan boost must be zero or more');
  }
  return ok({ pay, last, total, boost });
}
