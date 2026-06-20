import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
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

export function buildSummaryText(result: ComputeResult, total: number): string {
  const { dates, segDays, amounts } = result;
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  const pay = dates[0];
  const end = coverEnd(dates[dates.length - 1], segDays[segDays.length - 1]);

  const lines = [
    `Pacer plan: ${fmtMoney(total)} from ${fmtWdDmy(pay)} to ${fmtWdDmy(end)}`,
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
        fmtMoney(amounts[i]),
        fmtMoney(perDay(amounts[i], segDays[i])),
      ]),
    );
  });

  lines.push(
    row(['Total', '', String(totalDays), fmtMoney(total), fmtMoney(perDay(total, totalDays))]),
  );

  return lines.join('\n');
}
