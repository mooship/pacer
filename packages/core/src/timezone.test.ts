import { describe, expect, it } from 'vitest';
import { regionForTimeZone, TIMEZONE_REGION } from './timezone.js';

describe('timezone', () => {
  it('regionForTimeZone maps well-known zones to their region', () => {
    expect(regionForTimeZone('Africa/Johannesburg')).toBe('ZA');
    expect(regionForTimeZone('Europe/London')).toBe('GB');
    expect(regionForTimeZone('America/New_York')).toBe('US');
    expect(regionForTimeZone('Asia/Tokyo')).toBe('JP');
  });

  it('regionForTimeZone returns null for an unknown zone', () => {
    expect(regionForTimeZone('Not/AZone')).toBeNull();
    expect(regionForTimeZone('')).toBeNull();
  });

  it('every zone in the lookup table maps to a 2-letter ISO region code', () => {
    const zones = Object.keys(TIMEZONE_REGION);
    expect(zones.length).toBeGreaterThan(300);
    for (const zone of zones) {
      expect(TIMEZONE_REGION[zone]).toMatch(/^[A-Z]{2}$/);
    }
  });
});
