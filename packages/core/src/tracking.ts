import { type ComputeResult, currentSegment } from './compute.js';
import { idiv } from './math.js';

/** Comparison of actual vs. planned spend as of a given day, for the results view's pace banner. */
export interface PaceStatus {
  /** Minor-units amount the plan calls for having spent by `today`. */
  expected: number;
  /** Minor-units amount marked as spent so far. */
  actual: number;
  /** `actual - expected`: positive means spending ahead of the plan, negative means under it. */
  delta: number;
}

/**
 * Minor-units amount the plan calls for having spent by `today`, prorating
 * linearly through whichever segment is currently in progress. A plan not
 * yet started counts as 0; one that has finished counts as its full total.
 */
export function expectedSpent(result: ComputeResult, today: number): number {
  const { dates, segDays, amounts } = result;
  if (today < dates[0]) {
    return 0;
  }
  const idx = currentSegment(result, today);
  if (idx === null) {
    return amounts.reduce((a, b) => a + b, 0);
  }
  let total = 0;
  for (let i = 0; i < idx; i++) {
    total += amounts[i];
  }
  return total + idiv(amounts[idx] * (today - dates[idx] + 1), segDays[idx]);
}

/** Sum of the amounts of every payout whose date is in `marked`. */
export function actualSpent(result: ComputeResult, marked: ReadonlySet<number>): number {
  return result.dates.reduce(
    (sum, date, i) => (marked.has(date) ? sum + result.amounts[i] : sum),
    0,
  );
}

/**
 * Combines {@link expectedSpent} and {@link actualSpent} into one
 * comparison, or `null` if the plan hasn't started yet (nothing to compare).
 */
export function paceStatus(
  result: ComputeResult,
  today: number,
  marked: ReadonlySet<number>,
): PaceStatus | null {
  if (today < result.dates[0]) {
    return null;
  }
  const expected = expectedSpent(result, today);
  const actual = actualSpent(result, marked);
  return { expected, actual, delta: actual - expected };
}
