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
});
