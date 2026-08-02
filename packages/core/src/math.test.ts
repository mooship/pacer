import { describe, expect, it } from 'vitest';
import { clamp, idiv, remEuclid } from './math.js';

describe('idiv', () => {
  it('truncates toward zero', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(idiv(-7, 2)).toBe(-3);
    expect(idiv(7, -2)).toBe(-3);
  });

  it('divides evenly', () => {
    expect(idiv(10, 5)).toBe(2);
  });
});

describe('remEuclid', () => {
  it('is always non-negative for a positive modulus', () => {
    expect(remEuclid(5, 3)).toBe(2);
    expect(remEuclid(-1, 3)).toBe(2);
    expect(remEuclid(-4, 3)).toBe(2);
  });

  it('handles values far outside [-m, m]', () => {
    expect(remEuclid(100, 7)).toBe(2);
    expect(remEuclid(-100, 7)).toBe(5);
  });

  it('returns zero for an exact multiple', () => {
    expect(remEuclid(9, 3)).toBe(0);
    expect(remEuclid(-9, 3)).toBe(0);
  });
});

describe('clamp', () => {
  it('passes through values already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below the lower bound', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above the upper bound', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('resolves to hi when lo > hi, since max is applied before min', () => {
    expect(clamp(5, 10, 0)).toBe(0);
  });
});
