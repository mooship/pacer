import { describe, expect, it } from 'vitest';
import { classifyArg, HELP, unknownArgMessage, VERSION } from './args.js';

describe('classifyArg', () => {
  it('recognises help flags', () => {
    expect(classifyArg('-h')).toBe('help');
    expect(classifyArg('--help')).toBe('help');
  });

  it('recognises version flags', () => {
    expect(classifyArg('-V')).toBe('version');
    expect(classifyArg('--version')).toBe('version');
  });

  it('treats no argument as run', () => {
    expect(classifyArg(undefined)).toBe('run');
  });

  it('treats anything else as unknown', () => {
    expect(classifyArg('--nope')).toBe('unknown');
    expect(classifyArg('frobnicate')).toBe('unknown');
  });
});

describe('messages', () => {
  it('names the offending argument', () => {
    expect(unknownArgMessage('--nope')).toContain('`--nope`');
    expect(unknownArgMessage('--nope')).toContain('--help');
  });

  it('exposes usage help and a semver version', () => {
    expect(HELP).toContain('Usage:');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
