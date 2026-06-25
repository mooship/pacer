import { describe, expect, it } from 'vitest';
import { compute } from './compute.js';
import { defaultConfig } from './config.js';
import { daysFromCivil } from './date.js';
import { buildIcs } from './ics.js';

const result = compute(
  daysFromCivil(2026, 6, 25),
  daysFromCivil(2026, 7, 24),
  500000,
  0,
  defaultConfig(),
);
const ics = buildIcs(result, 500000, { now: daysFromCivil(2026, 6, 20) });

describe('ics', () => {
  it('wraps events in a VCALENDAR envelope', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
  });

  it('emits one event per payout date', () => {
    const events = ics.match(/BEGIN:VEVENT/g) ?? [];
    expect(events.length).toBe(result.dates.length);
  });

  it('uses all-day dates for each payout', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260625');
  });

  it('labels the first event as the bridge with its amount', () => {
    expect(ics).toContain('SUMMARY:Pacer: R700.00 (Bridge)');
  });

  it('includes a reminder alarm', () => {
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:PT9H');
  });

  it('uses CRLF line endings', () => {
    expect(ics).toContain('\r\n');
  });

  it('escapes special characters in text values', () => {
    const escaped = buildIcs(result, 500000, {
      now: daysFromCivil(2026, 6, 20),
      currency: 'a;b,c',
    });
    expect(escaped).toContain('SUMMARY:Pacer: a\\;b\\,c');
  });

  it('folds lines longer than 75 octets onto continuation lines', () => {
    const longCurrency = `CUR${'x'.repeat(90)} `;
    const folded = buildIcs(result, 500000, {
      now: daysFromCivil(2026, 6, 20),
      currency: longCurrency,
    });
    for (const line of folded.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    expect(folded).toContain('\r\n ');
  });

  it('folds multi-byte currency text without splitting a surrogate pair or UTF-8 sequence', () => {
    const emojiCurrency = `💰${'€'.repeat(40)}`;
    const folded = buildIcs(result, 500000, {
      now: daysFromCivil(2026, 6, 20),
      currency: emojiCurrency,
    });
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      expect(line).not.toContain('�');
      expect(() => Array.from(line)).not.toThrow();
    }
    expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(folded))).toBe(
      folded,
    );
  });

  it('falls back to a 9am reminder for a non-positive or non-integer hour', () => {
    for (const reminderHour of [0, -5, 2.5, Number.NaN]) {
      const out = buildIcs(result, 500000, { now: daysFromCivil(2026, 6, 20), reminderHour });
      expect(out).toContain('TRIGGER:PT9H');
    }
  });

  it('honours a valid custom reminder hour', () => {
    const out = buildIcs(result, 500000, { now: daysFromCivil(2026, 6, 20), reminderHour: 2 });
    expect(out).toContain('TRIGGER:PT2H');
  });

  it('produces a valid calendar with no events for an empty result', () => {
    const empty = buildIcs({ dates: [], segDays: [], amounts: [] }, 0, {
      now: daysFromCivil(2026, 6, 20),
    });
    expect(empty.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(empty.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(empty).not.toContain('BEGIN:VEVENT');
  });
});
