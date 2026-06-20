import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type Config, type ConfigLoad, defaultConfig, parseStoredConfig } from '@pacer/core';
import envPaths from 'env-paths';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

export function configPath(): string {
  const paths = envPaths('pacer', { suffix: '' });
  return join(paths.config, 'config.toml');
}

export function loadConfig(): ConfigLoad {
  let body: string;
  try {
    body = readFileSync(configPath(), 'utf8');
  } catch {
    return { config: defaultConfig(), invalid: false };
  }
  try {
    return parseStoredConfig(parseToml(body));
  } catch {
    return { config: defaultConfig(), invalid: true };
  }
}

export function saveConfig(config: Config): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringifyToml(config as unknown as Record<string, unknown>));
}
