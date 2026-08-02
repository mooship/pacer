import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('ok', () => {
  it('wraps a value as a successful result', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });
});

describe('err', () => {
  it('wraps a message as a failed result', () => {
    expect(err('bad input')).toEqual({ ok: false, error: 'bad input' });
  });
});
