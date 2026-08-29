/** A successful {@link Result}, carrying its value. */
export type Ok<T> = { ok: true; value: T };
/** A failed {@link Result}, carrying a human-readable error message. */
export type Err = { ok: false; error: string };
/** The outcome of a fallible operation: either {@link Ok} or {@link Err}. Used instead of throwing across core's validating functions. */
export type Result<T> = Ok<T> | Err;

/** Wraps a value as a successful {@link Result}. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
/** Wraps an error message as a failed {@link Result}. */
export const err = (error: string): Err => ({ ok: false, error });
