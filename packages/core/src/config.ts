import { z } from 'zod';

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

const remEuclid = (n: number, m: number): number => ((n % m) + m) % m;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function sanitize(config: Config): Config {
  return {
    quantum: Math.max(Math.trunc(config.quantum), 1),
    payday: remEuclid(Math.trunc(config.payday), 7),
    interval: clamp(Math.trunc(config.interval), 1, 366),
  };
}

export const ConfigSchema = z
  .object({
    quantum: z.number().int().catch(DEFAULT_QUANTUM),
    payday: z.number().int().catch(DEFAULT_PAYDAY),
    interval: z.number().int().catch(DEFAULT_INTERVAL),
  })
  .partial()
  .transform((c) =>
    sanitize({
      quantum: c.quantum ?? DEFAULT_QUANTUM,
      payday: c.payday ?? DEFAULT_PAYDAY,
      interval: c.interval ?? DEFAULT_INTERVAL,
    }),
  );

export function parseConfig(input: unknown): Config {
  const result = ConfigSchema.safeParse(input);
  return result.success ? result.data : defaultConfig();
}
