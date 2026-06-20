import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  type Config,
  type ConfigLoad,
  decodePlan,
  defaultConfig,
  type PlanSnapshot,
  parseStoredConfig,
} from '@pacer/core';
import envPaths from 'env-paths';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

function configDir(): string {
  return envPaths('pacer', { suffix: '' }).config;
}

function configPath(): string {
  return join(configDir(), 'config.toml');
}

function planPath(): string {
  return join(configDir(), 'plan.toml');
}

export function loadConfig(path = configPath()): ConfigLoad {
  let body: string;
  try {
    body = readFileSync(path, 'utf8');
  } catch {
    return { config: defaultConfig(), invalid: false };
  }
  try {
    return parseStoredConfig(parseToml(body));
  } catch {
    return { config: defaultConfig(), invalid: true };
  }
}

export function saveConfig(config: Config, path = configPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringifyToml(config as unknown as Record<string, unknown>));
}

export function loadPlan(path = planPath()): PlanSnapshot | null {
  let body: string;
  try {
    body = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  try {
    const raw = parseToml(body) as Record<string, unknown>;
    const decoded = decodePlan({ p: raw.pay, l: raw.last, t: raw.total, b: raw.boost });
    return decoded.ok ? decoded.value : null;
  } catch {
    return null;
  }
}

export function savePlan(snap: PlanSnapshot, path = planPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringifyToml(snap as unknown as Record<string, unknown>));
}

export function clearPlan(path = planPath()): void {
  try {
    rmSync(path);
  } catch {}
}
