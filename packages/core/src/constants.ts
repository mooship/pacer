/**
 * The longest plan period allowed, in days.
 *
 * Not consistently reused: `config.ts`'s `sanitize()` clamps `interval` with
 * a hardcoded `366` literal instead of importing this — grep for `366` too
 * if this value ever changes.
 */
export const MAX_DAYS = 366;
