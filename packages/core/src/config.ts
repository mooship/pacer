import { z } from 'zod';
import { isCurrencyCode } from './currency.js';
import { clamp, remEuclid } from './math.js';

/** Default recurring payout amount, in minor units (not scaled by currency). */
export const DEFAULT_QUANTUM = 5000;
/** Default recurring payout weekday: `WD[1]` = Monday. */
export const DEFAULT_PAYDAY = 1;
/** Default number of days between recurring payouts. */
export const DEFAULT_INTERVAL = 7;
/** Default ISO 4217 currency code. */
export const DEFAULT_CURRENCY = 'USD';

/**
 * User-configurable planner settings, persisted independently of any one
 * plan. `quantum` is a raw minor-units integer — it is not rescaled when
 * `currency` changes, so switching currency reformats the same number at
 * the new currency's decimal precision rather than converting its value.
 */
export interface Config {
  quantum: number;
  payday: number;
  interval: number;
  currency: string;
}

/** Builds a fresh {@link Config} from the `DEFAULT_*` constants. */
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

/**
 * Clamps every field of `config` to a valid range: `quantum` to at least 1,
 * `payday` folded into `[0, 6]`, `interval` to `[1, 366]`, and `currency` to
 * a recognized uppercase ISO 4217 code (falling back to {@link DEFAULT_CURRENCY}).
 */
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

/** Result of validating a persisted config payload. */
export interface ConfigLoad {
  /** The usable config: either the parsed input (with defaults filled in), or a fresh default config if parsing failed. */
  config: Config;
  /** Whether `input` failed validation entirely (bad JSON shape, not just a missing field). */
  invalid: boolean;
}

/**
 * Validates a persisted (e.g. `localStorage`) config payload. Any
 * missing or invalid individual field is filled from defaults rather than
 * rejecting the whole object; only a payload that isn't a valid partial
 * `Config` shape at all sets `invalid: true` and falls back entirely to
 * {@link defaultConfig}.
 */
export function parseStoredConfig(input: unknown): ConfigLoad {
  const result = StrictSchema.safeParse(input);
  return result.success
    ? { config: result.data, invalid: false }
    : { config: defaultConfig(), invalid: true };
}
