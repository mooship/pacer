import { afterEach, describe, expect, it } from 'vitest';
import { colorEnabled, makeTheme } from './theme.js';

const ORIGINAL_NO_COLOR = process.env.NO_COLOR;

afterEach(() => {
  if (ORIGINAL_NO_COLOR === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = ORIGINAL_NO_COLOR;
  }
});

describe('colorEnabled', () => {
  it('is enabled when NO_COLOR is unset', () => {
    delete process.env.NO_COLOR;
    expect(colorEnabled()).toBe(true);
  });

  it('is disabled when NO_COLOR is set to an empty string', () => {
    process.env.NO_COLOR = '';
    expect(colorEnabled()).toBe(false);
  });

  it('is disabled when NO_COLOR is set to any value', () => {
    process.env.NO_COLOR = '1';
    expect(colorEnabled()).toBe(false);
  });
});

describe('makeTheme', () => {
  it('returns colored keys when color is enabled', () => {
    expect(makeTheme(true)).toEqual({
      accent: 'cyan',
      green: 'green',
      yellow: 'yellow',
      red: 'red',
    });
  });

  it('returns an empty theme when color is disabled', () => {
    expect(makeTheme(false)).toEqual({});
  });
});
