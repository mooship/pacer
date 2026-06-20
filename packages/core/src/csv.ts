import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { fmtDmy, fmtRange } from './date.js';

export function buildCsv(result: ComputeResult, total: number): string {
  const { dates, segDays, amounts } = result;
  let out = 'Pay date,Covers,Days,Amount,Per day\n';
  for (let i = 0; i < dates.length; i++) {
    out += `"${fmtDmy(dates[i])}","${fmtRange(dates[i], coverEnd(dates[i], segDays[i]))}",${
      segDays[i]
    },"${fmtMoney(amounts[i])}","${fmtMoney(perDay(amounts[i], segDays[i]))}"\n`;
  }
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  out += `"Total",,${totalDays},"${fmtMoney(total)}","${fmtMoney(perDay(total, totalDays))}"\n`;
  return out;
}
