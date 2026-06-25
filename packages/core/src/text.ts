import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import type { Config } from './config.js';
import { fmtRange, fmtWdDmy } from './date.js';
import { BRIDGE_LABEL } from './planner.js';

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
  const recurring = fmtMoney(amounts[1], cur);
  const cadence = cfg.interval === 7 ? 'weekly' : `every ${cfg.interval} days`;
  return `Spend about ${steadyPerDay}/day — ${recurring} lands ${cadence} until ${fmtWdDmy(end)}.`;
}

export function buildSummaryText(result: ComputeResult, total: number, cfg: Config): string {
  const { dates, segDays, amounts } = result;
  const pay = dates[0];

  const lines = [`Pacer plan: ${fmtMoney(total, cfg.currency)} starting ${fmtWdDmy(pay)}`];

  if (dates.length > 1) {
    const bridgeEnd = coverEnd(pay, segDays[0]);
    lines.push(
      `${BRIDGE_LABEL}: ${fmtMoney(amounts[0], cfg.currency)} now, covers ${fmtRange(pay, bridgeEnd)}`,
    );
  }

  lines.push(summaryLine(result, total, cfg));

  return lines.join('\n');
}
