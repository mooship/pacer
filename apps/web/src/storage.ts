/** Reads `key` from `localStorage`, or `null` if unset or unreadable. */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes `value` to `localStorage` under `key`, or removes it if `value` is
 * `null`. Returns the caught error's message on failure, or `null` on success.
 */
export function writeStorage(key: string, value: string | null): string | null {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
    return null;
  } catch (e) {
    return String(e);
  }
}
