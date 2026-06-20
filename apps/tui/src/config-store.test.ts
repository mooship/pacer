import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultConfig } from '@pacer/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, saveConfig } from './config-store.js';

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pacer-'));
  path = join(dir, 'config.toml');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('config-store', () => {
  it('returns defaults for a missing file without flagging it invalid', () => {
    expect(loadConfig(path)).toEqual({ config: defaultConfig(), invalid: false });
  });

  it('round-trips a saved config', () => {
    const config = { quantum: 10000, payday: 5, interval: 14 };
    saveConfig(config, path);
    expect(loadConfig(path)).toEqual({ config, invalid: false });
  });

  it('fills defaults for a partial file', () => {
    writeFileSync(path, 'payday = 5\n');
    expect(loadConfig(path)).toEqual({
      config: { ...defaultConfig(), payday: 5 },
      invalid: false,
    });
  });

  it('flags a malformed file as invalid and falls back to defaults', () => {
    writeFileSync(path, 'this is = not valid toml [[[');
    expect(loadConfig(path)).toEqual({ config: defaultConfig(), invalid: true });
  });

  it('flags a wrong-typed value as invalid', () => {
    writeFileSync(path, 'payday = "monday"\n');
    expect(loadConfig(path)).toEqual({ config: defaultConfig(), invalid: true });
  });
});
