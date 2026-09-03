import { useEffect } from 'react';
import { notifyIfDue } from './notify.js';
import { usePacerStore } from './store.js';

/**
 * Shows a foreground payout-day notification whenever the tab is visible,
 * re-checking on every `visibilitychange`. Lives as a store-backed hook
 * rather than inline in a component so components stay pure renders over
 * store state.
 */
export function useNotifyOnPayoutDay(): void {
  const results = usePacerStore((s) => s.state.results);
  const today = usePacerStore((s) => s.state.today);
  const currency = usePacerStore((s) => s.state.config.currency);
  const notifyEnabled = usePacerStore((s) => s.notifyEnabled);

  useEffect(() => {
    if (!results) {
      return;
    }
    const check = () => {
      if (document.visibilityState === 'visible') {
        notifyIfDue(results, today, notifyEnabled, currency);
      }
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [results, today, notifyEnabled, currency]);
}
