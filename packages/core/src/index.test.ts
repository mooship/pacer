import { describe, expect, it } from 'vitest';
import { clamp, idiv, remEuclid } from './index.js';

describe('index barrel', () => {
  it('re-exports math.ts', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(remEuclid(-1, 3)).toBe(2);
    expect(clamp(5, 0, 3)).toBe(3);
  });
});
