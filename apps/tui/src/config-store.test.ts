import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { daysFromCivil, defaultConfig, type PlanSnapshot } from '@pacer/core';
import envPaths from 'env-paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPlan, loadConfig, loadPlan, saveConfig, savePlan } from './config-store.js';

vi.mock('env-paths', () => ({ default: vi.fn() }));

const mockEnvPaths = vi.mocked(envPaths);

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pacer-'));
  path = join(dir, 'config.toml');
  // Point the "no override" default path at the sandboxed temp dir instead
  // of the real platform config dir, so the default-path tests stay
  // isolated from whatever happens to exist on the host/CI machine.
  mockEnvPaths.mockReturnValue({ config: dir } as ReturnType<typeof envPaths>);
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

  it('flags a real read error (not just a missing file) as invalid', () => {
    // Reading a directory as a file fails with EISDIR, not ENOENT — this
    // should surface as invalid rather than being treated as "no file yet".
    const dirAsFile = join(dir, 'config.toml');
    mkdirSync(dirAsFile);
    expect(loadConfig(dirAsFile)).toEqual({ config: defaultConfig(), invalid: true });
  });

  it('round-trips a saved config via the resolved platform config path when no override is given', () => {
    const config = { quantum: 10000, payday: 5, interval: 14, currency: '$' };
    saveConfig(config);
    expect(loadConfig()).toEqual({ config, invalid: false });
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

  it('returns null without flagging it invalid for a missing plan', () => {
    expect(loadPlan(planFile)).toEqual({ snap: null, invalid: false });
  });

  it('round-trips a saved plan', () => {
    savePlan(snap, planFile);
    expect(loadPlan(planFile)).toEqual({ snap, invalid: false });
  });

  it('flags an out-of-range plan as invalid', () => {
    writeFileSync(planFile, 'pay = 100\nlast = 50\ntotal = 500000\nboost = 0\n');
    expect(loadPlan(planFile)).toEqual({ snap: null, invalid: true });
  });

  it('flags a malformed file as invalid', () => {
    writeFileSync(planFile, 'this is = not valid toml [[[');
    expect(loadPlan(planFile)).toEqual({ snap: null, invalid: true });
  });

  it('clears a saved plan', () => {
    savePlan(snap, planFile);
    clearPlan(planFile);
    expect(loadPlan(planFile)).toEqual({ snap: null, invalid: false });
  });

  it('flags a real read error (not just a missing file) as invalid', () => {
    const dirAsFile = join(dir, 'plan.toml');
    mkdirSync(dirAsFile);
    expect(loadPlan(dirAsFile)).toEqual({ snap: null, invalid: true });
  });

  it('round-trips a saved plan via the resolved platform plan path when no override is given', () => {
    savePlan(snap);
    expect(loadPlan()).toEqual({ snap, invalid: false });
  });
});
