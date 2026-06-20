export const idiv = (a: number, b: number): number => Math.trunc(a / b);

export const remEuclid = (n: number, m: number): number => ((n % m) + m) % m;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
