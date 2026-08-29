import { type ComputeResult, coverEnd, fmtMoney, perDay } from './compute.js';
import { DEFAULT_CURRENCY } from './config.js';
import { civilFromDays, fmtRange } from './date.js';
import { BRIDGE_LABEL } from './planner.js';

/** Options for {@link buildIcs}. */
export interface IcsOptions {
  /** Day number used for every `DTSTAMP` (kept deterministic in tests instead of reading `Date.now()`). */
  now: number;
  /** Hour of day (1-23) the reminder alarm fires; falls back to 9 if omitted or out of range. */
  reminderHour?: number;
  /** ISO 4217 currency code used to format amounts; defaults to {@link DEFAULT_CURRENCY}. */
  currency?: string;
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

const utf8Encoder = new TextEncoder();

function utf8Length(s: string): number {
  return utf8Encoder.encode(s).length;
}

/**
 * RFC 5545 line-folds `line` at 75 UTF-8 bytes (not characters), so
 * multibyte currency symbols don't get split mid-codepoint. Continuation
 * lines are prefixed with a single space per the spec.
 */
function fold(line: string): string {
  if (utf8Length(line) <= 75) {
    return line;
  }
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const chBytes = utf8Length(ch);
    if (currentBytes + chBytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
      limit = 74;
    }
    current += ch;
    currentBytes += chBytes;
  }
  parts.push(current);
  return parts.map((p, i) => (i === 0 ? p : ` ${p}`)).join('\r\n');
}

/**
 * Builds an RFC 5545 `.ics` calendar with one all-day `VEVENT` per payout in
 * `result`, each with a `VALARM` reminder at `opts.reminderHour`. The bridge
 * payment (index 0) is labeled with {@link BRIDGE_LABEL}.
 */
export function buildIcs(result: ComputeResult, total: number, opts: IcsOptions): string {
  const { dates, segDays, amounts } = result;
  const requested = opts.reminderHour ?? 9;
  const hour = Number.isInteger(requested) && requested > 0 && requested <= 23 ? requested : 9;
  const cur = opts.currency ?? DEFAULT_CURRENCY;
  const stamp = `${dateStamp(opts.now)}T000000Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pacer//Pacer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escapeText(`Pacer plan (${fmtMoney(total, cur)})`)}`),
  ];

  dates.forEach((d, i) => {
    const label =
      i === 0 ? `${fmtMoney(amounts[i], cur)} (${BRIDGE_LABEL})` : fmtMoney(amounts[i], cur);
    const covers = fmtRange(d, coverEnd(d, segDays[i]));
    const summary = `Pacer: ${label}`;
    const description = `${fmtMoney(amounts[i], cur)} covering ${covers} · ${fmtMoney(
      perDay(amounts[i], segDays[i]),
      cur,
    )}/day over ${segDays[i]} day${segDays[i] === 1 ? '' : 's'}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${dates[0]}-${total}-${d}-${amounts[i]}@pacer`,
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
