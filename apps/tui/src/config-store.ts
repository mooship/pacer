import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  type Config,
  type ConfigLoad,
  defaultConfig,
  type PlanSnapshot,
  parsePlan,
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

function isMissingFile(e: unknown): boolean {
  return e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT';
}

export function loadConfig(path = configPath()): ConfigLoad {
  let body: string;
  try {
    body = readFileSync(path, 'utf8');
  } catch (e) {
    return { config: defaultConfig(), invalid: !isMissingFile(e) };
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

export interface PlanLoad {
  snap: PlanSnapshot | null;
  invalid: boolean;
}

export function loadPlan(path = planPath()): PlanLoad {
  let body: string;
  try {
    body = readFileSync(path, 'utf8');
  } catch (e) {
    return { snap: null, invalid: !isMissingFile(e) };
  }
  try {
    const snap = parsePlan(parseToml(body) as Record<string, unknown>);
    return { snap, invalid: snap === null };
  } catch {
    return { snap: null, invalid: true };
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
