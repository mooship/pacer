import { z } from 'zod';
import { clamp, remEuclid } from './math.js';

export const DEFAULT_QUANTUM = 5000;
export const DEFAULT_PAYDAY = 1;
export const DEFAULT_INTERVAL = 7;

export interface Config {
  quantum: number;
  payday: number;
  interval: number;
}

export const defaultConfig = (): Config => ({
  quantum: DEFAULT_QUANTUM,
  payday: DEFAULT_PAYDAY,
  interval: DEFAULT_INTERVAL,
});

export function sanitize(config: Config): Config {
  return {
    quantum: Math.max(Math.trunc(config.quantum), 1),
    payday: remEuclid(Math.trunc(config.payday), 7),
    interval: clamp(Math.trunc(config.interval), 1, 366),
  };
}

const fields = {
  quantum: z.number().int(),
  payday: z.number().int(),
  interval: z.number().int(),
};

const fill = (c: Partial<Config>): Config =>
  sanitize({
    quantum: c.quantum ?? DEFAULT_QUANTUM,
    payday: c.payday ?? DEFAULT_PAYDAY,
    interval: c.interval ?? DEFAULT_INTERVAL,
  });

const LenientSchema = z
  .object({
    quantum: fields.quantum.catch(DEFAULT_QUANTUM),
    payday: fields.payday.catch(DEFAULT_PAYDAY),
    interval: fields.interval.catch(DEFAULT_INTERVAL),
  })
  .partial()
  .transform(fill);

const StrictSchema = z.object(fields).partial().transform(fill);

export function parseConfig(input: unknown): Config {
  const result = LenientSchema.safeParse(input);
  return result.success ? result.data : defaultConfig();
}

export interface ConfigLoad {
  config: Config;
  invalid: boolean;
}

export function parseStoredConfig(input: unknown): ConfigLoad {
  const result = StrictSchema.safeParse(input);
  return result.success
    ? { config: result.data, invalid: false }
    : { config: defaultConfig(), invalid: true };
}
