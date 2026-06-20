import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVAL,
  DEFAULT_QUANTUM,
  defaultConfig,
  parseConfig,
  sanitize,
} from './config.js';

describe('config', () => {
  it('sanitize clamps out of range', () => {
    expect(sanitize({ quantum: 0, payday: 9, interval: 999 })).toEqual({
      quantum: 1,
      payday: 2,
      interval: 366,
    });
    expect(sanitize({ quantum: -100, payday: -1, interval: 0 })).toEqual({
      quantum: 1,
      payday: 6,
      interval: 1,
    });
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
});
