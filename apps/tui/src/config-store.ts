import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type Config, sanitize } from '@pacer/core';
import envPaths from 'env-paths';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { z } from 'zod';

const StrictSchema = z
  .object({
    quantum: z.number().int().optional(),
    payday: z.number().int().optional(),
    interval: z.number().int().optional(),
  })
  .transform((c) =>
    sanitize({
      quantum: c.quantum ?? 5000,
      payday: c.payday ?? 1,
      interval: c.interval ?? 7,
    }),
  );

export function configPath(): string {
  const paths = envPaths('pacer', { suffix: '' });
  return join(paths.config, 'config.toml');
}

export interface LoadResult {
  config: Config;
  invalid: boolean;
}

export function loadConfig(): LoadResult {
  const fallback: Config = { quantum: 5000, payday: 1, interval: 7 };
  let body: string;
  try {
    body = readFileSync(configPath(), 'utf8');
  } catch {
    return { config: fallback, invalid: false };
  }
  try {
    const parsed = StrictSchema.safeParse(parseToml(body));
    if (!parsed.success) {
      return { config: fallback, invalid: true };
    }
    return { config: parsed.data, invalid: false };
  } catch {
    return { config: fallback, invalid: true };
  }
}

export function saveConfig(config: Config): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringifyToml(config as unknown as Record<string, unknown>));
}
