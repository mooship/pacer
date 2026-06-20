import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { civilFromDays, fmtRange } from './date.js';
import { BRIDGE_LABEL } from './planner.js';

export interface IcsOptions {
  now: number;
  reminderHour?: number;
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

function dateStamp(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return `${pad(y, 4)}${pad(m, 2)}${pad(d, 2)}`;
}

function escapeText(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

function fold(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  parts.push(` ${rest}`);
  return parts.join('\r\n');
}

export function buildIcs(result: ComputeResult, total: number, opts: IcsOptions): string {
  const { dates, segDays, amounts } = result;
  const hour = opts.reminderHour ?? 9;
  const stamp = `${dateStamp(opts.now)}T000000Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pacer//Pacer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Pacer plan (${fmtMoney(total)})`,
  ];

  dates.forEach((d, i) => {
    const label = i === 0 ? `${fmtMoney(amounts[i])} (${BRIDGE_LABEL})` : fmtMoney(amounts[i]);
    const covers = fmtRange(d, coverEnd(d, segDays[i]));
    const summary = `Pacer: ${label}`;
    const description = `${fmtMoney(amounts[i])} covering ${covers} · ${fmtMoney(
      perDay(amounts[i], segDays[i]),
    )}/day over ${segDays[i]} day${segDays[i] === 1 ? '' : 's'}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${d}-${amounts[i]}@pacer`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateStamp(d)}`,
      `DTEND;VALUE=DATE:${dateStamp(d + 1)}`,
      fold(`SUMMARY:${escapeText(summary)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${escapeText(summary)}`),
      `TRIGGER:PT${hour}H`,
      'END:VALARM',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
