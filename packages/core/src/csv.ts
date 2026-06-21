import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { fmtDmy, fmtRange } from './date.js';

export function buildCsv(result: ComputeResult, total: number, currency = 'R'): string {
  const { dates, segDays, amounts } = result;
  let out = 'Pay date,Covers,Days,Amount,Per day\n';
  for (let i = 0; i < dates.length; i++) {
    out += `"${fmtDmy(dates[i])}","${fmtRange(dates[i], coverEnd(dates[i], segDays[i]))}",${
      segDays[i]
    },"${fmtMoney(amounts[i], currency)}","${fmtMoney(perDay(amounts[i], segDays[i]), currency)}"\n`;
  }
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  out += `"Total",,${totalDays},"${fmtMoney(total, currency)}","${fmtMoney(
    perDay(total, totalDays),
    currency,
  )}"\n`;
  return out;
}
