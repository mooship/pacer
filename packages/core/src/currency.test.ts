import { describe, expect, it } from 'vitest';
import {
  CURRENCY_CODES,
  currencyDigits,
  currencyName,
  currencySymbol,
  isCurrencyCode,
} from './currency.js';

describe('currency', () => {
  it('lists a broad set of ISO 4217 codes', () => {
    expect(CURRENCY_CODES.length).toBeGreaterThan(100);
    expect(CURRENCY_CODES).toContain('USD');
    expect(CURRENCY_CODES).toContain('ZAR');
  });

  it('isCurrencyCode accepts known codes and rejects unknown ones', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('ZAR')).toBe(true);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode('XXX_NOPE')).toBe(false);
    expect(isCurrencyCode('')).toBe(false);
  });

  it('currencyDigits reflects each currency’s minor unit', () => {
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('ZAR')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('KWD')).toBe(3);
  });

  it('currencySymbol returns the narrow symbol when one exists', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('JPY')).toBe('¥');
  });

  it('currencySymbol returns the code itself for an unrecognized currency', () => {
    expect(currencySymbol('NOPE')).toBe('NOPE');
  });

  it('currencyName returns the English display name', () => {
    expect(currencyName('USD')).toBe('US Dollar');
    expect(currencyName('ZAR')).toBe('South African Rand');
  });

  it('currencyName returns the code itself for an unrecognized currency', () => {
    expect(currencyName('NOPE')).toBe('NOPE');
  });
});
