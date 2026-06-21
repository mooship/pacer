import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { type Config, DEFAULT_CURRENCY } from './config.js';
import { fmtDmy, fmtRange, fmtWdDmy } from './date.js';
import { BRIDGE_LABEL } from './planner.js';

const COLUMNS = ['Pay', 'Covers', 'Days', 'Amount', 'Per day'] as const;
const WIDTHS = [22, 18, 6, 12, 10] as const;

function row(cells: readonly string[]): string {
  return cells
    .map((c, i) => c.padEnd(WIDTHS[i]))
    .join('')
    .trimEnd();
}

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

export function buildSummaryText(
  result: ComputeResult,
  total: number,
  currency = DEFAULT_CURRENCY,
): string {
  const { dates, segDays, amounts } = result;
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  const pay = dates[0];
  const end = coverEnd(dates[dates.length - 1], segDays[segDays.length - 1]);

  const lines = [
    `Pacer plan: ${fmtMoney(total, currency)} from ${fmtWdDmy(pay)} to ${fmtWdDmy(end)}`,
    '',
    row(COLUMNS),
  ];

  dates.forEach((d, i) => {
    const label = i === 0 ? `${fmtDmy(d)} (${BRIDGE_LABEL})` : fmtDmy(d);
    lines.push(
      row([
        label,
        fmtRange(d, coverEnd(d, segDays[i])),
        String(segDays[i]),
        fmtMoney(amounts[i], currency),
        fmtMoney(perDay(amounts[i], segDays[i]), currency),
      ]),
    );
  });

  lines.push(
    row([
      'Total',
      '',
      String(totalDays),
      fmtMoney(total, currency),
      fmtMoney(perDay(total, totalDays), currency),
    ]),
  );

  return lines.join('\n');
}
