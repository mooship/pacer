import { z } from 'zod';
import { clamp, remEuclid } from './math.js';

export const DEFAULT_QUANTUM = 5000;
export const DEFAULT_PAYDAY = 1;
export const DEFAULT_INTERVAL = 7;
export const DEFAULT_CURRENCY = 'R';
export const MAX_CURRENCY_LEN = 3;

export interface Config {
  quantum: number;
  payday: number;
  interval: number;
  currency: string;
}

export const defaultConfig = (): Config => ({
  quantum: DEFAULT_QUANTUM,
  payday: DEFAULT_PAYDAY,
  interval: DEFAULT_INTERVAL,
  currency: DEFAULT_CURRENCY,
});

function sanitizeCurrency(currency: string): string {
  const trimmed = currency.trim().slice(0, MAX_CURRENCY_LEN);
  return trimmed === '' ? DEFAULT_CURRENCY : trimmed;
}

export function sanitize(config: Config): Config {
  return {
    quantum: Math.max(Math.trunc(config.quantum), 1),
    payday: remEuclid(Math.trunc(config.payday), 7),
    interval: clamp(Math.trunc(config.interval), 1, 366),
    currency: sanitizeCurrency(config.currency),
  };
}

const fields = {
  quantum: z.number().int(),
  payday: z.number().int(),
  interval: z.number().int(),
  currency: z.string(),
};

const fill = (c: Partial<Config>): Config =>
  sanitize({
    quantum: c.quantum ?? DEFAULT_QUANTUM,
    payday: c.payday ?? DEFAULT_PAYDAY,
    interval: c.interval ?? DEFAULT_INTERVAL,
    currency: c.currency ?? DEFAULT_CURRENCY,
  });

const LenientSchema = z
  .object({
    quantum: fields.quantum.catch(DEFAULT_QUANTUM),
    payday: fields.payday.catch(DEFAULT_PAYDAY),
    interval: fields.interval.catch(DEFAULT_INTERVAL),
    currency: fields.currency.catch(DEFAULT_CURRENCY),
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
