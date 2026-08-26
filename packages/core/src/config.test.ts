import { describe, expect, it } from 'vitest';
import { defaultConfig, parseStoredConfig, sanitize } from './config.js';

describe('config', () => {
  it('sanitize clamps out of range', () => {
    expect(sanitize({ quantum: 0, payday: 9, interval: 999, currency: 'ZAR' })).toEqual({
      quantum: 1,
      payday: 2,
      interval: 366,
      currency: 'ZAR',
    });
    expect(sanitize({ quantum: -100, payday: -1, interval: 0, currency: 'ZAR' })).toEqual({
      quantum: 1,
      payday: 6,
      interval: 1,
      currency: 'ZAR',
    });
  });

  it('sanitize trims and uppercases a valid currency code', () => {
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '  usd  ' }).currency).toBe(
      'USD',
    );
  });

  it('sanitize falls back to the default when the currency is not a real ISO code', () => {
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '' }).currency).toBe('ZAR');
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '$' }).currency).toBe('ZAR');
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: 'USDX' }).currency).toBe(
      'ZAR',
    );
  });

  it('parseStoredConfig fills defaults and reports validity', () => {
    expect(parseStoredConfig({ payday: 5 })).toEqual({
      config: { ...defaultConfig(), payday: 5 },
      invalid: false,
    });
    expect(parseStoredConfig({ quantum: 10000 })).toEqual({
      config: { ...defaultConfig(), quantum: 10000 },
      invalid: false,
    });
    expect(parseStoredConfig({ payday: 'oops' })).toEqual({
      config: defaultConfig(),
      invalid: true,
    });
    expect(parseStoredConfig('not an object').invalid).toBe(true);
  });

  it('parseStoredConfig rejects a non-integer field', () => {
    expect(parseStoredConfig({ quantum: 50.5 }).invalid).toBe(true);
    expect(parseStoredConfig({ interval: 7.5 }).invalid).toBe(true);
    expect(parseStoredConfig({ payday: 1.5 }).invalid).toBe(true);
  });

  it('sanitize treats a whitespace-only currency as empty', () => {
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '   ' }).currency).toBe(
      'ZAR',
    );
  });
});
