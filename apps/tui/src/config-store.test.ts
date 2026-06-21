import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { daysFromCivil, defaultConfig, type PlanSnapshot } from '@pacer/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearPlan, loadConfig, loadPlan, saveConfig, savePlan } from './config-store.js';

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
    const config = { quantum: 10000, payday: 5, interval: 14, currency: '$' };
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

describe('plan store', () => {
  let planFile: string;
  const snap: PlanSnapshot = {
    pay: daysFromCivil(2026, 6, 25),
    last: daysFromCivil(2026, 7, 24),
    total: 500000,
    boost: 15000,
  };

  beforeEach(() => {
    planFile = join(dir, 'plan.toml');
  });

  it('returns null for a missing plan', () => {
    expect(loadPlan(planFile)).toBeNull();
  });

  it('round-trips a saved plan', () => {
    savePlan(snap, planFile);
    expect(loadPlan(planFile)).toEqual(snap);
  });

  it('returns null for an out-of-range plan', () => {
    writeFileSync(planFile, 'pay = 100\nlast = 50\ntotal = 500000\nboost = 0\n');
    expect(loadPlan(planFile)).toBeNull();
  });

  it('clears a saved plan', () => {
    savePlan(snap, planFile);
    clearPlan(planFile);
    expect(loadPlan(planFile)).toBeNull();
  });
});
