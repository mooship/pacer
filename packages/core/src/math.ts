/** Truncating integer division (rounds toward zero), unlike `Math.floor(a / b)`. */
export const idiv = (a: number, b: number): number => Math.trunc(a / b);

/** Modulo that is always non-negative, even for a negative `n` (unlike `%`). */
export const remEuclid = (n: number, m: number): number => ((n % m) + m) % m;

/** Clamps `v` to the inclusive range `[lo, hi]`. */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
