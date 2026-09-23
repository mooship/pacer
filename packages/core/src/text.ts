import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import type { Config } from './config.js';
import { fmtRange, fmtWdDmy } from './date.js';
import { BRIDGE_LABEL } from './planner.js';

/**
 * The plain-language pace sentence, e.g. `"Spend about $50/day — payouts
 * land weekly until Wed 25 Jul."`. Uses singular per-day wording (no
 * recurring segment mentioned) when there's only a bridge payment, or the
 * recurring payouts sum to zero. Deliberately doesn't quote a single
 * recurring amount: the largest-remainder split in `compute()` can give
 * different payouts different amounts, so a single figure here could
 * misstate some of them — see each payout's own line in
 * {@link buildSummaryText} or the results table for the exact amounts.
 */
export function summaryLine(result: ComputeResult, total: number, cfg: Config): string {
  const { dates, segDays, amounts } = result;
  const cur = cfg.currency;
  const end = coverEnd(dates[dates.length - 1], segDays[segDays.length - 1]);

  const steadyTotal = amounts.slice(1).reduce((a, b) => a + b, 0);
  if (dates.length === 1 || steadyTotal === 0) {
    const totalDays = segDays.reduce((a, b) => a + b, 0);
    return `Spend about ${fmtMoney(perDay(total, totalDays), cur)}/day to reach ${fmtWdDmy(end)}.`;
  }

  const steadyDays = segDays.slice(1).reduce((a, b) => a + b, 0);
  const steadyPerDay = fmtMoney(perDay(steadyTotal, steadyDays), cur);
  const cadence =
    cfg.interval === 7 ? 'weekly' : cfg.interval === 1 ? 'daily' : `every ${cfg.interval} days`;
  return `Spend about ${steadyPerDay}/day — payouts land ${cadence} until ${fmtWdDmy(end)}.`;
}

/**
 * Builds the full clipboard/"Copy" text for a plan: a header line, one line
 * per payout (bridge plus every recurring payout, each with its own exact
 * amount and coverage span — the split isn't always even across recurring
 * payouts, so this lists each one rather than quoting a single "weekly"
 * figure), and the {@link summaryLine} pace sentence.
 */
export function buildSummaryText(result: ComputeResult, total: number, cfg: Config): string {
  const { dates, segDays, amounts } = result;
  const pay = dates[0];

  const lines = [`Pacer plan: ${fmtMoney(total, cfg.currency)} starting ${fmtWdDmy(pay)}`];

  if (dates.length > 1) {
    dates.forEach((date, i) => {
      const label = i === 0 ? BRIDGE_LABEL : fmtWdDmy(date);
      const amount = fmtMoney(amounts[i], cfg.currency);
      const covers = fmtRange(date, coverEnd(date, segDays[i]));
      lines.push(`${label}: ${amount}${i === 0 ? ' now' : ''}, covers ${covers}`);
    });
  }

  lines.push(summaryLine(result, total, cfg));

  return lines.join('\n');
}
