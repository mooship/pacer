import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVAL,
  DEFAULT_QUANTUM,
  defaultConfig,
  parseConfig,
  parseStoredConfig,
  sanitize,
} from './config.js';

describe('config', () => {
  it('sanitize clamps out of range', () => {
    expect(sanitize({ quantum: 0, payday: 9, interval: 999, currency: 'R' })).toEqual({
      quantum: 1,
      payday: 2,
      interval: 366,
      currency: 'R',
    });
    expect(sanitize({ quantum: -100, payday: -1, interval: 0, currency: 'R' })).toEqual({
      quantum: 1,
      payday: 6,
      interval: 1,
      currency: 'R',
    });
  });

  it('sanitize trims currency, caps length, and falls back when empty', () => {
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '  $  ' }).currency).toBe(
      '$',
    );
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: '' }).currency).toBe('R');
    expect(sanitize({ quantum: 5000, payday: 1, interval: 7, currency: 'USDX' }).currency).toBe(
      'USD',
    );
  });

  it('currency fills default when missing and round trips', () => {
    expect(parseConfig({ payday: 5 }).currency).toBe('R');
    const c = { ...defaultConfig(), currency: '€' };
    expect(parseConfig(c)).toEqual(c);
  });

  it('parseConfig round trips defaults', () => {
    const c = defaultConfig();
    expect(parseConfig(c)).toEqual(c);
  });

  it('partial input fills defaults', () => {
    const back = parseConfig({ payday: 5 });
    expect(back.payday).toBe(5);
    expect(back.quantum).toBe(DEFAULT_QUANTUM);
    expect(back.interval).toBe(DEFAULT_INTERVAL);
  });

  it('invalid input falls back to defaults', () => {
    expect(parseConfig({ payday: 'oops' })).toEqual(defaultConfig());
    expect(parseConfig('not an object')).toEqual(defaultConfig());
    expect(parseConfig(null)).toEqual(defaultConfig());
  });

  it('parseStoredConfig fills defaults and reports validity', () => {
    expect(parseStoredConfig({ payday: 5 })).toEqual({
      config: { ...defaultConfig(), payday: 5 },
      invalid: false,
    });
    expect(parseStoredConfig({ payday: 'oops' })).toEqual({
      config: defaultConfig(),
      invalid: true,
    });
    expect(parseStoredConfig('not an object').invalid).toBe(true);
  });
});
