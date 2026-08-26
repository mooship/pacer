import { z } from 'zod';
import { isCurrencyCode } from './currency.js';
import { clamp, remEuclid } from './math.js';

export const DEFAULT_QUANTUM = 5000;
export const DEFAULT_PAYDAY = 1;
export const DEFAULT_INTERVAL = 7;
export const DEFAULT_CURRENCY = 'ZAR';

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
  const upper = currency.trim().toUpperCase();
  return isCurrencyCode(upper) ? upper : DEFAULT_CURRENCY;
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

const StrictSchema = z.object(fields).partial().transform(fill);

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
