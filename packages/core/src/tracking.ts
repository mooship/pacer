import { type ComputeResult, coverEnd } from './compute.js';
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
 * linearly through whichever segment is currently in progress. Segments
 * that finish before `today` count in full; a segment starting after
 * `today` (and everything past it) isn't counted at all.
 */
export function expectedSpent(result: ComputeResult, today: number): number {
  const { dates, segDays, amounts } = result;
  let total = 0;
  for (let i = 0; i < dates.length; i++) {
    if (today < dates[i]) {
      break;
    }
    const end = coverEnd(dates[i], segDays[i]);
    if (today >= end) {
      total += amounts[i];
    } else {
      total += idiv(amounts[i] * (today - dates[i] + 1), segDays[i]);
    }
  }
  return total;
}

/** Sum of the amounts of every payout whose date is in `marked`. */
export function actualSpent(result: ComputeResult, marked: ReadonlySet<number>): number {
  return result.dates.reduce(
    (sum, date, i) => (marked.has(date) ? sum + result.amounts[i] : sum),
    0,
  );
}

/** Combines {@link expectedSpent} and {@link actualSpent} into one comparison. */
export function paceStatus(
  result: ComputeResult,
  today: number,
  marked: ReadonlySet<number>,
): PaceStatus {
  const expected = expectedSpent(result, today);
  const actual = actualSpent(result, marked);
  return { expected, actual, delta: actual - expected };
}
