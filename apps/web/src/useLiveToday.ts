import { today as currentToday } from '@pacer/core';
import { useEffect } from 'react';
import { usePacerStore } from './store.js';

/** How often to re-check the wall-clock date while the tab is visible. */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Keeps the store's `today` in sync with the wall-clock date. `today` is
 * fixed in state at wizard start (see planner.ts) so a render stays
 * internally consistent, but a tab or installed PWA left open across
 * midnight would otherwise show yesterday's date indefinitely — stale
 * "today" highlighting, pace tracking, and payout-day notifications. A
 * fresh page load already gets an accurate `today` (the store reads it at
 * creation), so this only needs to catch the date changing underneath an
 * already-running session: re-checks on `visibilitychange` and on a
 * lightweight interval while visible; a hidden/backgrounded tab does no work.
 */
export function useLiveToday(): void {
  const storedToday = usePacerStore((s) => s.state.today);
  const dispatch = usePacerStore((s) => s.dispatch);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const now = currentToday();
      if (now !== storedToday) {
        dispatch({ type: 'today', value: now });
      }
    };
    document.addEventListener('visibilitychange', check);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', check);
      clearInterval(interval);
    };
  }, [storedToday, dispatch]);
}
