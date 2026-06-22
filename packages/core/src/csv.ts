import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { DEFAULT_CURRENCY } from './config.js';
import { fmtDmy, fmtRange } from './date.js';

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsv(
  result: ComputeResult,
  total: number,
  currency = DEFAULT_CURRENCY,
): string {
  const { dates, segDays, amounts } = result;
  if (dates.length !== segDays.length || dates.length !== amounts.length) {
    throw new Error('buildCsv: result arrays must have matching lengths');
  }
  let out = 'Pay date,Covers,Days,Amount,Per day\n';
  for (let i = 0; i < dates.length; i++) {
    out += `${csvCell(fmtDmy(dates[i]))},${csvCell(
      fmtRange(dates[i], coverEnd(dates[i], segDays[i])),
    )},${segDays[i]},${csvCell(fmtMoney(amounts[i], currency))},${csvCell(
      fmtMoney(perDay(amounts[i], segDays[i]), currency),
    )}\n`;
  }
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  out += `${csvCell('Total')},,${totalDays},${csvCell(fmtMoney(total, currency))},${csvCell(
    fmtMoney(perDay(total, totalDays), currency),
  )}\n`;
  return out;
}
